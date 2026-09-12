const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { logActivity } = require('../utils/activityLog');
const { setUserPassword } = require('../config/nextcloud');

const VALID_PERMISSIONS = [
  'verifier_logiciels', 'moderer_communautaire', 'gerer_matricules',
  'gerer_utilisateurs', 'gerer_dossiers', 'voir_logs', 'gerer_taxonomie'
];

// ── Liste des admins (super + simple) avec leurs permissions ────────────────
exports.listAdmins = async (req, res) => {
  try {
    const [admins] = await db.execute(
      `SELECT id, matricule, nom, prenom, email, role, admin_level
       FROM users WHERE is_admin = TRUE ORDER BY admin_level, nom`
    );
    const [perms] = await db.execute('SELECT user_id, permission FROM admin_permissions');
    const withPerms = admins.map(a => ({
      ...a,
      permissions: perms.filter(p => p.user_id === a.id).map(p => p.permission)
    }));
    res.json({ success: true, admins: withPerms });
  } catch (error) {
    console.error('listAdmins:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste administrateurs' });
  }
};

// ── Recherche d'utilisateur (nom ou matricule) pour attribution de droits ───
exports.searchUsers = async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const [rows] = await db.execute(
      `SELECT id, matricule, nom, prenom, email, role, is_admin, admin_level
       FROM users WHERE matricule LIKE ? OR nom LIKE ? OR prenom LIKE ?
       LIMIT 20`,
      [q, q, q]
    );
    res.json({ success: true, users: rows });
  } catch (error) {
    console.error('searchUsers:', error.message);
    res.status(500).json({ success: false, message: 'Erreur recherche utilisateurs' });
  }
};

// ── Accorder / ajuster les droits admin d'un utilisateur ─────────────────────
// Réservé aux super admins (voir DECISIONS.md D-2026-09-04-05) : accorder des
// droits admin est l'action la plus sensible du système — on ne la délègue
// pas via une permission "à la carte" comme les autres actions du panel.
exports.grantAdmin = async (req, res) => {
  try {
    if (req.user.admin_level !== 'super') {
      return res.status(403).json({ success: false, message: 'Réservé aux super administrateurs' });
    }
    const { userId } = req.params;
    const { admin_level, permissions } = req.body;
    if (!['super', 'simple'].includes(admin_level)) {
      return res.status(400).json({ success: false, message: 'admin_level invalide (super|simple)' });
    }

    const [rows] = await db.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    await db.execute('UPDATE users SET is_admin = TRUE, admin_level = ? WHERE id = ?', [admin_level, userId]);

    // Un super admin a tous les droits implicitement : pas de lignes
    // admin_permissions pour lui (ni pour un admin simple qu'on repromeut).
    await db.execute('DELETE FROM admin_permissions WHERE user_id = ?', [userId]);
    if (admin_level === 'simple' && Array.isArray(permissions)) {
      for (const p of permissions.filter(p => VALID_PERMISSIONS.includes(p))) {
        await db.execute(
          'INSERT INTO admin_permissions (user_id, permission, granted_by) VALUES (?, ?, ?)',
          [userId, p, req.user.id]
        );
      }
    }

    await logActivity(
      req.user.id,
      admin_level === 'super' ? 'promotion_super_admin' : 'grant_admin_simple',
      'user', userId, JSON.stringify({ admin_level, permissions: permissions || [] })
    );

    res.json({ success: true, message: 'Droits admin mis à jour' });
  } catch (error) {
    console.error('grantAdmin:', error.message);
    res.status(500).json({ success: false, message: 'Erreur attribution droits admin' });
  }
};

// ── Retirer les droits admin d'un utilisateur ────────────────────────────────
exports.revokeAdmin = async (req, res) => {
  try {
    if (req.user.admin_level !== 'super') {
      return res.status(403).json({ success: false, message: 'Réservé aux super administrateurs' });
    }
    const { userId } = req.params;
    if (Number(userId) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Impossible de retirer vos propres droits admin' });
    }

    await db.execute('UPDATE users SET is_admin = FALSE, admin_level = NULL WHERE id = ?', [userId]);
    await db.execute('DELETE FROM admin_permissions WHERE user_id = ?', [userId]);
    await logActivity(req.user.id, 'revoke_admin', 'user', userId);

    res.json({ success: true, message: 'Droits admin retirés' });
  } catch (error) {
    console.error('revokeAdmin:', error.message);
    res.status(500).json({ success: false, message: 'Erreur retrait droits admin' });
  }
};

// ── Dossiers prioritaires (voir DECISIONS.md D-2026-09-04-06) ────────────────
// Le compte de ressources ne peut se faire que par faculté/niveau : la
// classification des ressources communautaires (D-2026-09-04-01) n'a pas de
// dimension filière, seulement Faculté/Niveau/Catégorie — le compte ignore
// donc filiere_id, qui reste un simple libellé d'affichage sur le dossier.
exports.listPriorityFolders = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT pf.id, pf.faculty_id, f.nom AS faculty_nom, pf.filiere_id, ff.nom AS filiere_nom,
              pf.level_id, l.nom AS level_nom, pf.created_by, pf.created_at,
              (SELECT COUNT(*) FROM community_resources cr
                WHERE cr.faculty_id = pf.faculty_id
                  AND (pf.level_id IS NULL OR cr.level_id = pf.level_id)
                  AND cr.status = 'visible') AS resource_count
       FROM community_priority_folders pf
       JOIN faculties f            ON f.id = pf.faculty_id
       LEFT JOIN faculty_filieres ff ON ff.id = pf.filiere_id
       LEFT JOIN levels l           ON l.id = pf.level_id
       ORDER BY pf.created_at DESC`
    );
    res.json({ success: true, folders: rows });
  } catch (error) {
    console.error('listPriorityFolders:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste dossiers prioritaires' });
  }
};

// ── Filières d'une faculté (pour le formulaire "Créer un dossier prioritaire")
exports.listFacultyFilieres = async (req, res) => {
  try {
    const { faculty_id } = req.query;
    const params = [];
    let where = '';
    if (faculty_id) { where = 'WHERE faculty_id = ?'; params.push(faculty_id); }

    const [rows] = await db.execute(
      `SELECT id, faculty_id, nom FROM faculty_filieres ${where} ORDER BY nom`,
      params
    );
    res.json({ success: true, filieres: rows });
  } catch (error) {
    console.error('listFacultyFilieres:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste filières' });
  }
};

exports.createPriorityFolder = async (req, res) => {
  try {
    const { faculty_id, filiere_id, level_id } = req.body;
    if (!faculty_id) return res.status(400).json({ success: false, message: 'faculty_id requis' });

    const [r] = await db.execute(
      `INSERT INTO community_priority_folders (faculty_id, filiere_id, level_id, created_by)
       VALUES (?, ?, ?, ?)`,
      [faculty_id, filiere_id || null, level_id || null, req.user.id]
    );
    await logActivity(req.user.id, 'creer_dossier_prioritaire', 'priority_folder', r.insertId);
    res.status(201).json({ success: true, message: 'Dossier prioritaire créé', id: r.insertId });
  } catch (error) {
    console.error('createPriorityFolder:', error.message);
    res.status(500).json({ success: false, message: 'Erreur création dossier prioritaire' });
  }
};

exports.deletePriorityFolder = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM community_priority_folders WHERE id = ?', [id]);
    await logActivity(req.user.id, 'supprimer_dossier_prioritaire', 'priority_folder', id);
    res.json({ success: true, message: 'Dossier prioritaire retiré' });
  } catch (error) {
    console.error('deletePriorityFolder:', error.message);
    res.status(500).json({ success: false, message: 'Erreur suppression dossier prioritaire' });
  }
};

// ── Journal d'activité (voir DECISIONS.md D-2026-09-04-07) ───────────────────
exports.listLogs = async (req, res) => {
  try {
    const { user, action, from, to } = req.query;
    const clauses = [];
    const params  = [];
    if (user)   { clauses.push('l.user_id = ?');     params.push(user); }
    if (action) { clauses.push('l.action = ?');      params.push(action); }
    if (from)   { clauses.push('l.created_at >= ?'); params.push(from); }
    if (to)     { clauses.push('l.created_at <= ?'); params.push(to); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [rows] = await db.execute(
      `SELECT l.id, l.user_id, u.nom, u.prenom, u.matricule, l.action, l.cible_type, l.cible_id, l.details, l.created_at
       FROM activity_logs l
       JOIN users u ON u.id = l.user_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT 500`,
      params
    );
    res.json({ success: true, logs: rows });
  } catch (error) {
    console.error('listLogs:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste journaux' });
  }
};

// ── Utilisateurs (Panel Admin base — permission gerer_utilisateurs) ─────────
exports.listUsers = async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const [rows] = await db.execute(
      `SELECT id, matricule, nom, prenom, email, role, filiere, is_active, created_at
       FROM users WHERE matricule LIKE ? OR nom LIKE ? OR prenom LIKE ? OR email LIKE ?
       ORDER BY created_at DESC LIMIT 200`,
      [q, q, q, q]
    );
    res.json({ success: true, users: rows });
  } catch (error) {
    console.error('listUsers:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste utilisateurs' });
  }
};

// ── Réinitialisation de mot de passe par un admin (utilisateur bloqué qui a
// perdu son mot de passe, ne peut donc pas passer par changePassword qui
// exige l'ancien). Même ordre Nextcloud-d'abord que changePassword (voir
// authController) pour ne jamais désynchroniser nc_password du vrai mot de
// passe NC. Le mot de passe temporaire n'est renvoyé qu'une fois dans cette
// réponse — à communiquer à l'utilisateur hors-bande (jamais stocké en clair
// nulle part d'autre que nc_password, déjà un choix assumé du projet).
exports.resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.execute('SELECT nextcloud_username FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    const tempPassword = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '') + 'Aa1!';

    await setUserPassword(rows[0].nextcloud_username, tempPassword);

    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    await db.execute(
      'UPDATE users SET password = ?, nc_password = ? WHERE id = ?',
      [hashedPassword, tempPassword, userId]
    );
    await db.execute('DELETE FROM sessions WHERE user_id = ?', [userId]); // force une reconnexion avec le nouveau mot de passe

    await logActivity(req.user.id, 'reinitialiser_mot_de_passe', 'user', userId);

    res.json({ success: true, message: 'Mot de passe réinitialisé', tempPassword });
  } catch (error) {
    console.error('resetUserPassword:', error.message);
    res.status(500).json({ success: false, message: 'Erreur réinitialisation du mot de passe' });
  }
};

exports.toggleUserActive = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.execute('SELECT is_active FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    const nextActive = !rows[0].is_active;
    await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [nextActive, userId]);
    await logActivity(req.user.id, nextActive ? 'activer_utilisateur' : 'desactiver_utilisateur', 'user', userId);

    res.json({ success: true, message: nextActive ? 'Compte réactivé' : 'Compte désactivé', is_active: nextActive });
  } catch (error) {
    console.error('toggleUserActive:', error.message);
    res.status(500).json({ success: false, message: 'Erreur mise à jour utilisateur' });
  }
};

// ── Matricules — liste blanche (Panel Admin base — permission gerer_matricules)
exports.listMatricules = async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const [rows] = await db.execute(
      `SELECT m.id, m.matricule, m.nom, m.prenom, m.role, m.filiere, m.created_at,
              (u.id IS NOT NULL) AS is_used
       FROM matricules m
       LEFT JOIN users u ON u.matricule = m.matricule
       WHERE m.matricule LIKE ? OR m.nom LIKE ? OR m.prenom LIKE ?
       ORDER BY m.created_at DESC LIMIT 300`,
      [q, q, q]
    );
    res.json({ success: true, matricules: rows.map(r => ({ ...r, is_used: !!r.is_used })) });
  } catch (error) {
    console.error('listMatricules:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste matricules' });
  }
};

exports.addMatricule = async (req, res) => {
  try {
    const { matricule, nom, prenom, role, filiere } = req.body;
    if (!matricule || !nom || !prenom || !role) {
      return res.status(400).json({ success: false, message: 'matricule, nom, prenom et role sont requis' });
    }
    if (!['etudiant', 'professeur', 'assistant'].includes(role)) {
      return res.status(400).json({ success: false, message: 'role invalide' });
    }

    const [existing] = await db.execute('SELECT id FROM matricules WHERE matricule = ?', [matricule]);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Ce matricule existe déjà' });

    const [r] = await db.execute(
      'INSERT INTO matricules (matricule, nom, prenom, role, filiere) VALUES (?, ?, ?, ?, ?)',
      [matricule, nom, prenom, role, role === 'etudiant' ? (filiere || null) : null]
    );
    await logActivity(req.user.id, 'ajouter_matricule', 'matricule', r.insertId, matricule);

    res.status(201).json({ success: true, message: 'Matricule ajouté', id: r.insertId });
  } catch (error) {
    console.error('addMatricule:', error.message);
    res.status(500).json({ success: false, message: 'Erreur ajout matricule' });
  }
};

exports.deleteMatricule = async (req, res) => {
  try {
    const { matricule } = req.params;
    const [existing] = await db.execute('SELECT id FROM matricules WHERE matricule = ?', [matricule]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Matricule introuvable' });

    // La FK users.matricule -> matricules.matricule empêche la suppression
    // si un compte est déjà inscrit sur ce matricule (comportement voulu :
    // on ne retire pas l'accès a posteriori à un compte déjà créé).
    try {
      await db.execute('DELETE FROM matricules WHERE matricule = ?', [matricule]);
    } catch (fkError) {
      return res.status(409).json({ success: false, message: 'Impossible : un compte est déjà inscrit sur ce matricule' });
    }
    await logActivity(req.user.id, 'retirer_matricule', 'matricule', null, matricule);

    res.json({ success: true, message: 'Matricule retiré de la liste blanche' });
  } catch (error) {
    console.error('deleteMatricule:', error.message);
    res.status(500).json({ success: false, message: 'Erreur suppression matricule' });
  }
};

// ── Taxonomie Espace communautaire (Axe F6, DECISIONS.md D-2026-09-12-03) ──
// CRUD sur les 4 référentiels — les valeurs de départ (Sciences
// Informatiques, L1-L5, Cours/Logiciel/Media/Autre) n'étaient qu'un
// échantillon, pas une liste figée. Permission dédiée `gerer_taxonomie`.
exports.createFaculty = async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom?.trim()) return res.status(400).json({ success: false, message: 'nom requis' });
    const [r] = await db.execute('INSERT INTO faculties (nom) VALUES (?)', [nom.trim()]);
    await logActivity(req.user.id, 'creer_faculte', 'faculty', r.insertId, nom.trim());
    res.status(201).json({ success: true, message: 'Faculté créée', id: r.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Cette faculté existe déjà' });
    console.error('createFaculty:', error.message);
    res.status(500).json({ success: false, message: 'Erreur création faculté' });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    // ON DELETE SET NULL sur community_resources/community_priority_folders
    // (voir schéma) : les ressources déjà classées dans cette faculté
    // repassent simplement en "Général", rien ne casse.
    await db.execute('DELETE FROM faculties WHERE id = ?', [id]);
    await logActivity(req.user.id, 'supprimer_faculte', 'faculty', id);
    res.json({ success: true, message: 'Faculté supprimée' });
  } catch (error) {
    console.error('deleteFaculty:', error.message);
    res.status(500).json({ success: false, message: 'Erreur suppression faculté' });
  }
};

exports.createFiliereEntry = async (req, res) => {
  try {
    const { faculty_id, nom } = req.body;
    if (!faculty_id || !nom?.trim()) return res.status(400).json({ success: false, message: 'faculty_id et nom requis' });
    const [r] = await db.execute('INSERT INTO faculty_filieres (faculty_id, nom) VALUES (?, ?)', [faculty_id, nom.trim()]);
    await logActivity(req.user.id, 'creer_filiere', 'faculty_filiere', r.insertId, nom.trim());
    res.status(201).json({ success: true, message: 'Filière créée', id: r.insertId });
  } catch (error) {
    console.error('createFiliereEntry:', error.message);
    res.status(500).json({ success: false, message: 'Erreur création filière' });
  }
};

exports.deleteFiliereEntry = async (req, res) => {
  try {
    const { id } = req.params;
    // ON DELETE CASCADE sur community_priority_folders.filiere_id : un
    // dossier prioritaire basé sur cette filière disparaît avec elle.
    await db.execute('DELETE FROM faculty_filieres WHERE id = ?', [id]);
    await logActivity(req.user.id, 'supprimer_filiere', 'faculty_filiere', id);
    res.json({ success: true, message: 'Filière supprimée' });
  } catch (error) {
    console.error('deleteFiliereEntry:', error.message);
    res.status(500).json({ success: false, message: 'Erreur suppression filière' });
  }
};

exports.createLevelEntry = async (req, res) => {
  try {
    const { nom, ordre } = req.body;
    if (!nom?.trim()) return res.status(400).json({ success: false, message: 'nom requis' });
    const [r] = await db.execute('INSERT INTO levels (nom, ordre) VALUES (?, ?)', [nom.trim(), parseInt(ordre) || 0]);
    await logActivity(req.user.id, 'creer_niveau', 'level', r.insertId, nom.trim());
    res.status(201).json({ success: true, message: 'Niveau créé', id: r.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Ce niveau existe déjà' });
    console.error('createLevelEntry:', error.message);
    res.status(500).json({ success: false, message: 'Erreur création niveau' });
  }
};

exports.deleteLevelEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM levels WHERE id = ?', [id]);
    await logActivity(req.user.id, 'supprimer_niveau', 'level', id);
    res.json({ success: true, message: 'Niveau supprimé' });
  } catch (error) {
    console.error('deleteLevelEntry:', error.message);
    res.status(500).json({ success: false, message: 'Erreur suppression niveau' });
  }
};

exports.createCategoryEntry = async (req, res) => {
  try {
    const { nom, is_logiciel, ordre } = req.body;
    if (!nom?.trim()) return res.status(400).json({ success: false, message: 'nom requis' });
    const [r] = await db.execute(
      'INSERT INTO community_categories (nom, is_logiciel, ordre) VALUES (?, ?, ?)',
      [nom.trim(), !!is_logiciel, parseInt(ordre) || 0]
    );
    await logActivity(req.user.id, 'creer_categorie', 'community_category', r.insertId, nom.trim());
    res.status(201).json({ success: true, message: 'Catégorie créée', id: r.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Cette catégorie existe déjà' });
    console.error('createCategoryEntry:', error.message);
    res.status(500).json({ success: false, message: 'Erreur création catégorie' });
  }
};

exports.deleteCategoryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    // Pas de FK stricte depuis community_resources.categorie (VARCHAR
    // simple, voir migration 2026-09-12) : supprimer une catégorie ne casse
    // jamais les ressources déjà déposées sous ce nom, elle disparaît juste
    // des choix proposés pour les nouveaux dépôts.
    await db.execute('DELETE FROM community_categories WHERE id = ?', [id]);
    await logActivity(req.user.id, 'supprimer_categorie', 'community_category', id);
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('deleteCategoryEntry:', error.message);
    res.status(500).json({ success: false, message: 'Erreur suppression catégorie' });
  }
};
