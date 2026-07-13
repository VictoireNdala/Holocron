const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const { createNextcloudUser, addUserToGroup, setUserQuota } = require('../config/nextcloud');

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
    await db.execute(
      `INSERT INTO users
        (matricule, nom, prenom, email, password, nc_password, role, filiere, nextcloud_username)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matricule, matriculeData.nom, matriculeData.prenom, email,
        hashedPassword, password, role, matriculeData.filiere, nextcloudUsername
      ]
    );

    // 7. Créer le compte Nextcloud
    await createNextcloudUser(
      nextcloudUsername, password, email,
      `${matriculeData.prenom} ${matriculeData.nom}`
    );

    // 8. Groupes + quota selon le rôle
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
      process.env.JWT_SECRET || 'holocron_secret_2024',
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
