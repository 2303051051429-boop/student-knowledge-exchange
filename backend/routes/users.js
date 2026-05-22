const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { getDB } = require('../database/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Multer config for avatar uploads — /tmp on Vercel (bundle dir is read-only)
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);
const UPLOAD_DIR = IS_SERVERLESS ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, `avatar_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });


// GET /api/users/:id — Public profile
router.get('/:id', (req, res) => {
  const db   = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { password_hash, ...safe } = user;

  const skills   = db.prepare('SELECT * FROM skills WHERE user_id = ? ORDER BY type, created_at').all(req.params.id);
  const reviews  = db.prepare(`
    SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
    FROM reviews r JOIN users u ON u.id = r.reviewer_id
    WHERE r.reviewee_id = ? ORDER BY r.created_at DESC LIMIT 10
  `).all(req.params.id);

  res.json({ user: safe, skills, reviews });
});

// PUT /api/users/:id — Update profile (protected)
router.put('/:id', auth, (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });

  const { name, university, bio } = req.body;
  const db = getDB();

  db.prepare('UPDATE users SET name = ?, university = ?, bio = ? WHERE id = ?')
    .run(name, university, bio, req.params.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  const { password_hash, ...safe } = user;
  res.json({ user: safe });
});

// POST /api/users/:id/avatar
router.post('/:id/avatar', auth, upload.single('avatar'), (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const avatarUrl = `/uploads/${req.file.filename}`;
  const db = getDB();
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.params.id);
  res.json({ avatarUrl });
});

// GET /api/users/:id/skills
router.get('/:id/skills', (req, res) => {
  const db = getDB();
  const skills = db.prepare('SELECT * FROM skills WHERE user_id = ? ORDER BY type, name').all(req.params.id);
  res.json({ skills });
});

// POST /api/users/:id/skills
router.post('/:id/skills', auth, (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  const { v4: uuidv4 } = require('uuid');
  const { name, category, type, level, price_per_hr, is_swap, description } = req.body;
  const db = getDB();

  const id = uuidv4();
  db.prepare(`
    INSERT INTO skills (id, user_id, name, category, type, level, price_per_hr, is_swap, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, name, category, type || 'teach', level || 'intermediate', price_per_hr || 0, is_swap ? 1 : 0, description || '', new Date().toISOString());

  res.status(201).json({ id });
});

module.exports = router;
