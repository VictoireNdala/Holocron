const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const { createNextcloudUser, deleteNextcloudUser, addUserToGroup, setUserQuota, setUserPassword } = require('../config/nextcloud');
const JWT_SECRET = require('../config/jwt');

// Quotas par rôle (état 12 juillet : étudiant 2 GB, prof 10 GB, assistant 5 GB)
const QUOTA = { etudiant: '2 GB', professeur: '10 GB', assistant: '5 GB' };

// ── Vérifier si un matricule est autorisé (table matricules, PAS users) ──────
exports.verifyMatricule = async (req, res) => {
  try {
    const { matricule } = req.params;
    // BUG HISTORIQUE #3 : cette requête doit interroger `matricules` (la liste
    // blanche des matricules autorisés), jamais `users`. Ne pas re-inverser.
    const [rows] = await db.execute(
      'SELECT * FROM matricules WHERE matricule = ?',
      [matricule]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Matricule invalide ou non reconnu' });
    }

    res.json({
      success: true,
      role:    rows[0].role,
      nom:     rows[0].nom,
      prenom:  rows[0].prenom,
      filiere: rows[0].filiere
    });
  } catch (error) {
    console.error('verifyMatricule:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ── Inscription ──────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { matricule, email, password, role } = req.body;

    // 1. Le matricule doit exister dans la liste blanche
    const [matriculeRows] = await db.execute(
      'SELECT * FROM matricules WHERE matricule = ?',
      [matricule]
    );
    if (matriculeRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Matricule invalide' });
    }
    const matriculeData = matriculeRows[0];

    // 2. Le rôle doit correspondre au préfixe/matricule
    if (matriculeData.role !== role) {
      return res.status(400).json({ success: false, message: 'Le rôle ne correspond pas à ce matricule' });
    }

    // 3. Pas déjà inscrit
    const [existingUser] = await db.execute(
      'SELECT * FROM users WHERE matricule = ? OR email = ?',
      [matricule, email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'Ce matricule ou email est déjà utilisé' });
    }

    // 4. Hash pour le login portail
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Username Nextcloud : ETU-20244936 -> etu_20244936
    const nextcloudUsername = matricule.toLowerCase().replace(/-/g, '_');

    // 6. Créer le compte MySQL — on stocke AUSSI le mot de passe en clair dans
    //    nc_password : indispensable pour le WebDAV per-user (Nextcloud 33 bloque
    //    l'écriture cross-user par l'admin). Voir fileController.userWebdav().
    const [insertResult] = await db.execute(
      `INSERT INTO users
        (matricule, nom, prenom, email, password, nc_password, role, filiere, nextcloud_username)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matricule, matriculeData.nom, matriculeData.prenom, email,
        hashedPassword, password, role, matriculeData.filiere, nextcloudUsername
      ]
    );
    const newUserId = insertResult.insertId;

    // 7-8. Compte Nextcloud + groupes/quota — isolés dans leur propre bloc
    // pour permettre un rollback ciblé (B0, CONTEXT.md piège #13) : si l'une
    // de ces étapes échoue, on ne doit JAMAIS laisser le compte MySQL créé
    // au step 6 sans compte Nextcloud correspondant (sinon connexion
    // possible mais toute opération fichier échoue en 401/429 en boucle).
    let nextcloudAccountCreated = false;
    try {
      await createNextcloudUser(
        nextcloudUsername, password, email,
        `${matriculeData.prenom} ${matriculeData.nom}`
      );
      nextcloudAccountCreated = true;

      if (role === 'etudiant') {
        await addUserToGroup(nextcloudUsername, 'Etudiants');
        if (matriculeData.filiere) {
          await addUserToGroup(nextcloudUsername, matriculeData.filiere);
        }
        await setUserQuota(nextcloudUsername, QUOTA.etudiant);
      } else if (role === 'professeur') {
        await addUserToGroup(nextcloudUsername, 'Professeurs');
        await setUserQuota(nextcloudUsername, QUOTA.professeur);
      } else if (role === 'assistant') {
        await addUserToGroup(nextcloudUsername, 'Assistants');
        await setUserQuota(nextcloudUsername, QUOTA.assistant);
      }
    } catch (nextcloudError) {
      console.error('register: échec Nextcloud, rollback du compte MySQL:', nextcloudError.message);

      await db.execute('DELETE FROM users WHERE id = ?', [newUserId]);

      // Le compte Nextcloud a pu être créé avant l'échec (groupe/quota en
      // erreur) — le supprimer aussi, sinon une nouvelle tentative
      // d'inscription sur ce matricule échouera (username déjà pris côté
      // Nextcloud) avec un compte mal configuré (sans groupe/quota).
      if (nextcloudAccountCreated) {
        try {
          await deleteNextcloudUser(nextcloudUsername);
        } catch (cleanupError) {
          console.error('register: échec nettoyage compte Nextcloud orphelin:', cleanupError.message);
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du compte (service de stockage indisponible) — réessayez dans quelques instants.'
      });
    }

    res.status(201).json({ success: true, message: 'Compte créé avec succès' });

  } catch (error) {
    console.error('register:', error.message);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du compte' });
  }
};

// ── Connexion ────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { matricule, password } = req.body;
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE matricule = ?',
      [matricule]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Matricule ou mot de passe incorrect' });
    }
    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Matricule ou mot de passe incorrect' });
    }

    // JWT — volontairement léger (id, role, matricule, nextcloud_username).
    // nom/prenom/nc_password sont récupérés depuis la BDD au besoin.
    const token = jwt.sign(
      {
        id: user.id, role: user.role,
        matricule: user.matricule, nextcloud_username: user.nextcloud_username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.execute(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    res.json({
      success: true, token,
      user: {
        id: user.id, matricule: user.matricule, nom: user.nom, prenom: user.prenom,
        email: user.email, role: user.role, filiere: user.filiere,
        nextcloud_username: user.nextcloud_username
      }
    });

  } catch (error) {
    console.error('login:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ── Changement de mot de passe (C1) ─────────────────────────────────────────
// Met à jour le mot de passe à 3 endroits en même temps : Nextcloud (source
// de vérité pour le WebDAV per-user), users.password (hash, login portail) et
// users.nc_password (clair, requis par userWebdav() dans fileController).
// Ordre volontaire : Nextcloud d'abord — si ça échoue, on ne touche pas la
// BDD, pour ne jamais désynchroniser nc_password du vrai mot de passe NC.
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel et nouveau requis' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const [rows] = await db.execute(
      'SELECT password, nextcloud_username FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    const user = rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    await setUserPassword(user.nextcloud_username, newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.execute(
      'UPDATE users SET password = ?, nc_password = ? WHERE id = ?',
      [hashedPassword, newPassword, req.user.id]
    );

    res.json({ success: true, message: 'Mot de passe changé avec succès' });
  } catch (error) {
    console.error('changePassword:', error.message);
    res.status(500).json({ success: false, message: 'Erreur lors du changement de mot de passe' });
  }
};

// ── Déconnexion ──────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await db.execute('DELETE FROM sessions WHERE token = ?', [token]);
    res.json({ success: true, message: 'Déconnecté avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
