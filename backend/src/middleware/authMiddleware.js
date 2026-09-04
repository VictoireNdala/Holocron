const jwt = require('jsonwebtoken');
const db  = require('../config/db');

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Récupérer le token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Accès non autorisé - Token manquant' });
    }

    // 2. Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'holocron_secret_2024');

    // 3. Vérifier que la session existe en BDD
    const [sessions] = await db.execute(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    if (sessions.length === 0) {
      return res.status(401).json({ success: false, message: 'Session expirée - Reconnectez-vous' });
    }

    // 4. Récupérer nc_password + filiere + statut admin depuis la BDD et les
    //    attacher à req.user (le JWT ne contient PAS nc_password : trop long
    //    pour la colonne sessions.token, et c'est plus sûr. On l'attache ici
    //    pour le WebDAV per-user de fileController. is_admin/admin_level sont
    //    utilisés par checkAdmin/checkPermission ci-dessous, Panel Admin D2.)
    const [rows] = await db.execute(
      'SELECT nc_password, filiere, nom, prenom, is_admin, admin_level FROM users WHERE id = ?',
      [decoded.id]
    );

    req.user = {
      ...decoded,
      nc_password: rows[0]?.nc_password || null,
      filiere:     rows[0]?.filiere     || decoded.filiere || null,
      nom:         rows[0]?.nom         || null,
      prenom:      rows[0]?.prenom      || null,
      is_admin:    !!rows[0]?.is_admin,
      admin_level: rows[0]?.admin_level || null,
    };
    next();

  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
};

// Middleware pour vérifier le rôle (accepte plusieurs rôles)
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé - Permissions insuffisantes' });
    }
    next();
  };
};

// ── Panel Admin avancé (D2) — voir DECISIONS.md D-2026-09-04-05 ─────────────
// checkAdmin : accès réservé à tout admin (super ou simple), sans distinction
// de permission — pour les écrans/actions communes aux deux niveaux.
const checkAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ success: false, message: 'Accès refusé - Réservé aux administrateurs' });
  }
  next();
};

// checkPermission(permission) : un super admin passe toujours (tous les
// droits implicitement) ; un admin simple doit avoir la permission précise
// dans admin_permissions. Un non-admin est rejeté avant même la requête BDD.
const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ success: false, message: 'Accès refusé - Réservé aux administrateurs' });
    }
    if (req.user.admin_level === 'super') return next();

    try {
      const [rows] = await db.execute(
        'SELECT 1 FROM admin_permissions WHERE user_id = ? AND permission = ?',
        [req.user.id, permission]
      );
      if (rows.length === 0) {
        return res.status(403).json({ success: false, message: `Accès refusé - Permission '${permission}' requise` });
      }
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erreur vérification permission' });
    }
  };
};

module.exports = { authMiddleware, checkRole, checkAdmin, checkPermission };
