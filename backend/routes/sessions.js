const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB }  = require('../database/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Generate a fake Google Meet link
function genMeetLink() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`;
}

// GET /api/sessions/slots/:userId/:date — Available time slots
router.get('/slots/:userId/:date', (req, res) => {
  const { userId, date } = req.params;
  const db = getDB();

  const bookedSlots = db.prepare(`
    SELECT time_slot FROM sessions
    WHERE (teacher_id = ? OR learner_id = ?) AND date = ? AND status != 'cancelled'
  `).all(userId, userId, date).map(s => s.time_slot);

  const allSlots = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
  const available = allSlots.filter(s => !bookedSlots.includes(s));

  res.json({ date, available, booked: bookedSlots });
});

// GET /api/sessions/my — My sessions (protected)
router.get('/my', auth, (req, res) => {
  const db = getDB();
  const userId = req.user.id;

  const sessions = db.prepare(`
    SELECT sess.*,
      t.name as teacher_name, t.avatar as teacher_avatar, t.university as teacher_uni,
      l.name as learner_name, l.avatar as learner_avatar
    FROM sessions sess
    JOIN users t ON t.id = sess.teacher_id
    JOIN users l ON l.id = sess.learner_id
    WHERE sess.teacher_id = ? OR sess.learner_id = ?
    ORDER BY sess.date DESC, sess.time_slot DESC
  `).all(userId, userId);

  const upcoming  = sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled');
  const past      = sessions.filter(s => s.status === 'completed');
  const cancelled = sessions.filter(s => s.status === 'cancelled');

  res.json({ upcoming, past, cancelled });
});

// POST /api/sessions — Book a session (protected)
router.post('/', auth, (req, res) => {
  const { teacherId, skillId, skillName, date, timeSlot, durationMin, notes } = req.body;
  if (!teacherId || !date || !timeSlot) return res.status(400).json({ error: 'Missing required fields' });

  const db = getDB();
  const learnerId = req.user.id;

  // Don't book yourself
  if (teacherId === learnerId) return res.status(400).json({ error: 'Cannot book yourself' });

  // Check slot conflict
  const conflict = db.prepare(`
    SELECT id FROM sessions WHERE teacher_id = ? AND date = ? AND time_slot = ? AND status != 'cancelled'
  `).get(teacherId, date, timeSlot);
  if (conflict) return res.status(409).json({ error: 'That slot is already booked' });

  // Get skill price
  let price = 0;
  if (skillId) {
    const skill = db.prepare('SELECT price_per_hr FROM skills WHERE id = ?').get(skillId);
    if (skill) price = skill.price_per_hr;
  }

  const id       = uuidv4();
  const meetLink = genMeetLink();
  const now      = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (id, teacher_id, learner_id, skill_id, skill_name, date, time_slot, duration_min, status, meet_link, price, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `).run(id, teacherId, learnerId, skillId || null, skillName || 'General Session', date, timeSlot, durationMin || 60, meetLink, price, notes || '', now);

  // Notify teacher
  const { getIO } = require('../utils/notificationHelper');
  const notifId = uuidv4();
  db.prepare(`INSERT INTO notifications (id, user_id, type, payload_json, read, created_at) VALUES (?, ?, 'new_booking', ?, 0, ?)`)
    .run(notifId, teacherId, JSON.stringify({ sessionId: id, learnerName: req.user.name }), now);
  const io = getIO();
  if (io) io.to(`user_${teacherId}`).emit('notification', { type: 'new_booking', message: `${req.user.name} booked a session with you!`, payload: { sessionId: id } });

  res.status(201).json({ id, meetLink });
});

// PATCH /api/sessions/:id/status
router.patch('/:id/status', auth, (req, res) => {
  const { status } = req.body;
  if (!['confirmed','cancelled','completed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const db   = getDB();
  const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!sess) return res.status(404).json({ error: 'Session not found' });

  // Only teacher or learner can update
  if (sess.teacher_id !== req.user.id && sess.learner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, req.params.id);

  // Award XP on completion
  if (status === 'completed') {
    db.prepare('UPDATE users SET sessions_taught = sessions_taught + 1, xp = xp + 50 WHERE id = ?').run(sess.teacher_id);
    db.prepare('UPDATE users SET sessions_taken  = sessions_taken  + 1, xp = xp + 30 WHERE id = ?').run(sess.learner_id);
  }

  res.json({ ok: true });
});

module.exports = router;
