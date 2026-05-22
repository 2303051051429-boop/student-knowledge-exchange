const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/challenges
router.get('/', auth, (req, res) => {
  const db = getDB();
  const challenges = db.prepare('SELECT * FROM challenges ORDER BY xp_reward').all();

  const withProgress = challenges.map(c => {
    const progress = db.prepare('SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ?').get(req.user.id, c.id);
    return {
      ...c,
      userProgress: progress ? progress.progress : 0,
      completed:    progress ? !!progress.completed : false,
      completedAt:  progress ? progress.completed_at : null,
    };
  });

  res.json({ challenges: withProgress });
});

// POST /api/challenges/:id/complete (internal use, called by server on events)
router.post('/:id/complete', auth, (req, res) => {
  const db = getDB();
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const existing = db.prepare('SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ?').get(req.user.id, req.params.id);
  if (existing && existing.completed) return res.status(409).json({ error: 'Already completed' });

  const now = new Date().toISOString();
  if (existing) {
    db.prepare('UPDATE user_challenges SET completed = 1, completed_at = ? WHERE id = ?').run(now, existing.id);
  } else {
    db.prepare(`INSERT INTO user_challenges (id, user_id, challenge_id, progress, completed, completed_at) VALUES (?, ?, ?, 1, 1, ?)`)
      .run(uuidv4(), req.user.id, req.params.id, now);
  }

  // Award XP
  db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(challenge.xp_reward, req.user.id);

  const { getIO } = require('../utils/notificationHelper');
  const io = getIO();
  if (io) {
    io.to(`user_${req.user.id}`).emit('notification', {
      type: 'badge_earned',
      message: `${challenge.badge_emoji} You earned the "${challenge.title}" badge! +${challenge.xp_reward} XP`,
      payload: { challengeId: challenge.id }
    });
  }

  res.json({ ok: true, xpEarned: challenge.xp_reward, badge: challenge.badge_emoji });
});

module.exports = router;
