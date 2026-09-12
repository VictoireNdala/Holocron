const db = require('../config/db');

// Fan-out à l'écriture (voir database/init.sql) — non bloquant sur erreur,
// même philosophie que utils/activityLog.js : une notification ratée ne doit
// jamais faire échouer l'action métier qui l'a déclenchée.
const notifyUsers = async (userIds, { type, title, message = null, link = null }) => {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  try {
    const values = ids.map(id => [id, type, title, message, link]);
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES ?',
      [values]
    );
  } catch (error) {
    console.error('notifyUsers:', error.message);
  }
};

const notifyUser = (userId, payload) => notifyUsers([userId], payload);

// Tous les étudiants d'une filière (nouveau devoir)
const notifyFiliere = async (filiere, payload) => {
  try {
    const [rows] = await db.execute(
      "SELECT id FROM users WHERE role = 'etudiant' AND filiere = ? AND is_active = TRUE",
      [filiere]
    );
    await notifyUsers(rows.map(r => r.id), payload);
  } catch (error) {
    console.error('notifyFiliere:', error.message);
  }
};

// Tous les utilisateurs actifs sauf l'auteur (dépôt communautaire)
const notifyAllExcept = async (excludeUserId, payload) => {
  try {
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE is_active = TRUE AND id != ?',
      [excludeUserId]
    );
    await notifyUsers(rows.map(r => r.id), payload);
  } catch (error) {
    console.error('notifyAllExcept:', error.message);
  }
};

module.exports = { notifyUser, notifyUsers, notifyFiliere, notifyAllExcept };
