const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../database/db');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'skillswap_default_secret_key';
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('university').optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, email, password, university, bio } = req.body;
    const db = getDB();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id   = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    const now  = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, university, bio, credits, xp, sessions_taught, sessions_taken, avg_rating, review_count, is_verified, avatar, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 50, 0, 0, 0, 0, 0, 0, NULL, ?)
    `).run(id, name, email, hash, university || null, bio || null, now);

    const user  = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = signToken(user);

    res.status(201).json({
      token,
      user: safeUser(user)
    });
  }
);

// POST /api/auth/login
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { email, password } = req.body;
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  }
);

// GET /api/auth/me  (protected)
router.get('/me', require('../middleware/authMiddleware'), (req, res) => {
  const db   = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: safeUser(user) });
});

function safeUser(u) {
  const { password_hash, ...safe } = u;
  return safe;
}

module.exports = router;
