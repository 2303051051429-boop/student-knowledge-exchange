const express = require('express');
const { getDB } = require('../database/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/notifications (protected)
router.get('/', auth, (req, res) => {
  const db = getDB();
  const notifs = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
  `).all(req.user.id);
  const unread = notifs.filter(n => !n.read).length;
  res.json({ notifications: notifs, unread });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', auth, (req, res) => {
  const db = getDB();
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, (req, res) => {
  const db = getDB();
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
