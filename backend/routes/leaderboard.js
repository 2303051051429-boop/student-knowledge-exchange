const express = require('express');
const { getDB } = require('../database/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/leaderboard?period=weekly|alltime
router.get('/', (req, res) => {
  const db     = getDB();
  const period = req.query.period || 'alltime';

  // For simplicity, "weekly" shows top XP gainers (in a real app you'd store weekly snapshots)
  const users = db.prepare(`
    SELECT id, name, university, avatar, xp, sessions_taught, avg_rating, review_count, is_verified
    FROM users
    ORDER BY ${period === 'weekly' ? 'sessions_taught' : 'xp'} DESC
    LIMIT 20
  `).all();

  // Attach badges (top challenges completed)
  const withBadges = users.map((u, i) => {
    const badges = db.prepare(`
      SELECT c.badge_emoji, c.title FROM user_challenges uc
      JOIN challenges c ON c.id = uc.challenge_id
      WHERE uc.user_id = ? AND uc.completed = 1
    `).all(u.id);
    return { ...u, rank: i + 1, badges };
  });

  res.json({ leaderboard: withBadges, period });
});

module.exports = router;
