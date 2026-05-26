const express = require('express');
const { getDB } = require('../database/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/messages/:partnerId — Conversation history (protected)
router.get('/:partnerId', auth, (req, res) => {
  const db  = getDB();
  const me  = req.user.id;
  const them = req.params.partnerId;

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
    FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(me, them, them, me);

  // Mark as read
  db.prepare('UPDATE messages SET read = 1 WHERE receiver_id = ? AND sender_id = ?').run(me, them);

  res.json({ messages });
});

// GET /api/messages — All conversations (inbox)
router.get('/', auth, (req, res) => {
  const db = getDB();
  const me = req.user.id;

  const convos = db.prepare(`
    SELECT
      CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as partner_id,
      u.name as partner_name, u.avatar as partner_avatar, u.university as partner_uni,
      m.content as last_message, m.created_at as last_at, m.type as last_type,
      SUM(CASE WHEN m.receiver_id = ? AND m.read = 0 THEN 1 ELSE 0 END) as unread_count
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY partner_id
    ORDER BY last_at DESC
  `).all(me, me, me, me, me);

  res.json({ conversations: convos });
});

// POST /api/messages — Send a message via REST (serverless fallback)
router.post('/', auth, (req, res) => {
  const db = getDB();
  const { v4: uuidv4 } = require('uuid');
  const { receiverId, content } = req.body;
  if (!receiverId || !content) return res.status(400).json({ error: 'receiverId and content required' });

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare('INSERT INTO messages (id, sender_id, receiver_id, content, type, read, created_at) VALUES (?,?,?,?,?,0,?)')
    .run(id, req.user.id, receiverId, content, 'text', now);

  res.status(201).json({ message: { id, sender_id: req.user.id, receiver_id: receiverId, content, type: 'text', read: 0, created_at: now } });
});

// PATCH /api/messages/:partnerId/read — Mark messages as read
router.patch('/:partnerId/read', auth, (req, res) => {
  const db = getDB();
  db.prepare('UPDATE messages SET read = 1 WHERE receiver_id = ? AND sender_id = ?').run(req.user.id, req.params.partnerId);
  res.json({ success: true });
});

module.exports = router;
