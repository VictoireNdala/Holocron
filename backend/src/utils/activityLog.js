const db = require('../config/db');

// Journal d'activité (Panel Admin avancé, D2) — voir DECISIONS.md
// D-2026-09-04-07. Un log raté ne doit jamais faire échouer l'action
// elle-même : erreur avalée et journalisée en console seulement.
const logActivity = async (userId, action, cibleType = null, cibleId = null, details = null) => {
  try {
    await db.execute(
      'INSERT INTO activity_logs (user_id, action, cible_type, cible_id, details) VALUES (?, ?, ?, ?, ?)',
      [userId, action, cibleType, cibleId, details]
    );
  } catch (error) {
    console.error('logActivity:', error.message);
  }
};

module.exports = { logActivity };
