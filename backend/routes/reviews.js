const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/reviews
router.post('/', auth, (req, res) => {
  const { sessionId, revieweeId, rating, comment } = req.body;
  if (!sessionId || !revieweeId || !rating) return res.status(400).json({ error: 'Missing fields' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });

  const db  = getDB();
  const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!sess) return res.status(404).json({ error: 'Session not found' });
  if (sess.status !== 'completed') return res.status(400).json({ error: 'Session not completed yet' });
  if (sess.teacher_id !== req.user.id && sess.learner_id !== req.user.id) return res.status(403).json({ error: 'Not your session' });

  // Check duplicate
  const dup = db.prepare('SELECT id FROM reviews WHERE session_id = ? AND reviewer_id = ?').get(sessionId, req.user.id);
  if (dup) return res.status(409).json({ error: 'Already reviewed this session' });

  const id  = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO reviews (id, session_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, sessionId, req.user.id, revieweeId, rating, comment || '', now);

  // Update reviewee avg_rating
  const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE reviewee_id = ?').get(revieweeId);
  db.prepare('UPDATE users SET avg_rating = ?, review_count = ? WHERE id = ?')
    .run(Math.round(stats.avg * 10) / 10, stats.cnt, revieweeId);

  // XP for 5-star
  if (rating === 5) db.prepare('UPDATE users SET xp = xp + 25 WHERE id = ?').run(revieweeId);

  res.status(201).json({ id });
});

// GET /api/reviews/:userId
router.get('/:userId', (req, res) => {
  const db = getDB();
  const reviews = db.prepare(`
    SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar, u.university as reviewer_uni
    FROM reviews r JOIN users u ON u.id = r.reviewer_id
    WHERE r.reviewee_id = ? ORDER BY r.created_at DESC
  `).all(req.params.userId);
  res.json({ reviews });
});

module.exports = router;
