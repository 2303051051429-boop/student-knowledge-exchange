const express = require('express');
const { getDB } = require('../database/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Smart Peer Matching Algorithm
 * Scores each potential match based on:
 *  - Complementary skills (they teach what you want to learn, and vice versa) → 40pts each
 *  - Rating quality → up to 20pts
 *  - Activity level (sessions taught) → up to 10pts
 *  - Not already connected → bonus
 */
router.get('/', auth, (req, res) => {
  const db     = getDB();
  const userId = req.user.id;

  // My skills
  const myTeach = db.prepare("SELECT name, category FROM skills WHERE user_id = ? AND type = 'teach'").all(userId);
  const myLearn = db.prepare("SELECT name, category FROM skills WHERE user_id = ? AND type = 'learn'").all(userId);

  // All other users
  const others = db.prepare(`
    SELECT u.id, u.name, u.university, u.avatar, u.avg_rating, u.xp, u.sessions_taught, u.is_verified, u.bio
    FROM users u WHERE u.id != ? ORDER BY u.xp DESC LIMIT 50
  `).all(userId);

  const scored = others.map(u => {
    const theyTeach = db.prepare("SELECT name, category FROM skills WHERE user_id = ? AND type = 'teach'").all(u.id);
    const theyLearn = db.prepare("SELECT name, category FROM skills WHERE user_id = ? AND type = 'learn'").all(u.id);

    let score = 0;

    // They teach what I want to learn
    for (const want of myLearn) {
      const match = theyTeach.find(s => s.category === want.category || s.name.toLowerCase().includes(want.name.toLowerCase()));
      if (match) score += 40;
    }
    // I teach what they want to learn
    for (const offer of myTeach) {
      const match = theyLearn.find(s => s.category === offer.category || s.name.toLowerCase().includes(offer.name.toLowerCase()));
      if (match) score += 40;
    }

    // Rating bonus (0–20)
    score += (u.avg_rating / 5) * 20;
    // Activity bonus (0–10)
    score += Math.min(u.sessions_taught / 10, 1) * 10;

    const matchedTeachSkills = theyTeach.filter(t => myLearn.some(l => l.category === t.category)).map(s => s.name);
    const matchedLearnSkills = theyLearn.filter(t => myTeach.some(l => l.category === t.category)).map(s => s.name);

    return { ...u, matchScore: Math.round(score), matchedTeachSkills, matchedLearnSkills };
  });

  // Sort by score, return top 5
  const top = scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  res.json({ matches: top });
});

module.exports = router;
