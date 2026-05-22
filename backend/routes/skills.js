const express = require('express');
const { getDB } = require('../database/db');
const auth = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/skills — list all with optional filters
router.get('/', (req, res) => {
  const db = getDB();
  const { q, category, minPrice, maxPrice, minRating, type, swap } = req.query;

  let sql = `
    SELECT s.*, u.name as teacher_name, u.university, u.avatar, u.avg_rating, u.review_count, u.is_verified, u.xp
    FROM skills s
    JOIN users u ON u.id = s.user_id
    WHERE s.type = 'teach'
  `;
  const params = [];

  if (q)         { sql += ` AND (s.name LIKE ? OR s.description LIKE ? OR u.name LIKE ?)`; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (category)  { sql += ` AND s.category = ?`;   params.push(category); }
  if (minPrice)  { sql += ` AND s.price_per_hr >= ?`; params.push(Number(minPrice)); }
  if (maxPrice !== undefined && maxPrice !== '') { sql += ` AND s.price_per_hr <= ?`; params.push(Number(maxPrice)); }
  if (minRating) { sql += ` AND u.avg_rating >= ?`; params.push(Number(minRating)); }
  if (swap === 'true') { sql += ` AND s.is_swap = 1`; }

  sql += ` ORDER BY u.avg_rating DESC, u.sessions_taught DESC`;

  const skills = db.prepare(sql).all(...params);
  res.json({ skills });
});

// GET /api/skills/categories — distinct categories
router.get('/categories', (req, res) => {
  const db = getDB();
  const cats = db.prepare(`SELECT DISTINCT category, COUNT(*) as count FROM skills WHERE type='teach' GROUP BY category ORDER BY count DESC`).all();
  res.json({ categories: cats });
});

// GET /api/skills/:id
router.get('/:id', (req, res) => {
  const db = getDB();
  const skill = db.prepare(`
    SELECT s.*, u.name as teacher_name, u.university, u.avatar, u.avg_rating, u.review_count, u.bio, u.is_verified, u.xp
    FROM skills s JOIN users u ON u.id = s.user_id WHERE s.id = ?
  `).get(req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  res.json({ skill });
});

module.exports = router;
