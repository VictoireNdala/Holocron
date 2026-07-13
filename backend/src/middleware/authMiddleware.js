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

    // 4. Récupérer nc_password + filiere depuis la BDD et les attacher à req.user
    //    (le JWT ne contient PAS nc_password : trop long pour la colonne sessions.token,
    //     et c'est plus sûr. On l'attache ici pour le WebDAV per-user de fileController.)
    const [rows] = await db.execute(
      'SELECT nc_password, filiere, nom, prenom FROM users WHERE id = ?',
      [decoded.id]
    );

    req.user = {
      ...decoded,
      nc_password: rows[0]?.nc_password || null,
      filiere:     rows[0]?.filiere     || decoded.filiere || null,
      nom:         rows[0]?.nom         || null,
      prenom:      rows[0]?.prenom      || null,
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

module.exports = { authMiddleware, checkRole };
