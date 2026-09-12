const db = require('../config/db');

exports.listNotifications = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, type, title, message, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const [[{ unread }]] = await db.execute(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true, notifications: rows, unread });
  } catch (error) {
    console.error('listNotifications:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste notifications' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('markRead:', error.message);
    res.status(500).json({ success: false, message: 'Erreur mise à jour notification' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('markAllRead:', error.message);
    res.status(500).json({ success: false, message: 'Erreur mise à jour notifications' });
  }
};
