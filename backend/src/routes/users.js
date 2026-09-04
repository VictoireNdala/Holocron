const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const db = require('../config/db');

// Profil du user connecté
// BUG HISTORIQUE (matricule "—") : cette route inline court-circuite tout
// userController. Sa requête DOIT inclure `matricule`. Ne pas l'enlever.
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, matricule, nom, prenom, email, role, filiere,
              nextcloud_username, created_at, is_admin, admin_level
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    const user = rows[0];
    // Panel Admin avancé (D2) : le frontend a besoin de savoir précisément ce
    // qu'un admin simple peut faire (super admin = tout, implicite).
    let permissions = [];
    if (user.is_admin && user.admin_level === 'simple') {
      const [perms] = await db.execute('SELECT permission FROM admin_permissions WHERE user_id = ?', [user.id]);
      permissions = perms.map(p => p.permission);
    }
    res.json({ success: true, user: { ...user, is_admin: !!user.is_admin, permissions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Statistiques (remplace le "124" codé en dur) — nombre d'étudiants inscrits
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [[{ students }]] = await db.execute(
      "SELECT COUNT(*) AS students FROM users WHERE role = 'etudiant'"
    );
    const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM users');
    res.json({ success: true, stats: { students, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
