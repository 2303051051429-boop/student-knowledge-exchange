require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);

// ── App setup ────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── DB bootstrap (wrapped so init errors surface as 500, not crash) ──
let dbReady = false;
try {
  const { initDB } = require('./database/db');
  initDB();
  dbReady = true;
} catch (err) {
  console.error('❌ DB init failed:', err.message, err.stack);
}

// Guard: if DB failed, return helpful error on every API request
app.use('/api', (req, res, next) => {
  if (!dbReady) return res.status(500).json({ error: 'DB not ready', details: 'Check server logs' });
  next();
});

// ── Static uploads (local only — not persistent on Vercel) ───
if (!IS_SERVERLESS) {
  const uploadDir = path.join(__dirname, 'uploads');
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { /* ignore */ }
  app.use('/uploads', express.static(uploadDir));
}

// ── Frontend (local only — Vercel CDN serves it directly) ────
if (!IS_SERVERLESS) {
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
}

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/skills',        require('./routes/skills'));
app.use('/api/sessions',      require('./routes/sessions'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/match',         require('./routes/matching'));
app.use('/api/challenges',    require('./routes/challenges'));
app.use('/api/leaderboard',   require('./routes/leaderboard'));

// ── Health & debug ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbReady, serverless: IS_SERVERLESS, node: process.version, time: new Date() });
});

app.get('/api/debug', (req, res) => {
  try {
    const db    = require('./database/db').getDB();
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
    res.json({ ok: true, users: count.c, node: process.version, serverless: IS_SERVERLESS });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

// ── SPA fallback (local only) ────────────────────────────────
if (!IS_SERVERLESS) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });
}

// ── Socket.io (local only) ───────────────────────────────────
if (!IS_SERVERLESS) {
  try {
    const { Server }    = require('socket.io');
    const { initSocket } = require('./utils/notificationHelper');
    const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });
    initSocket(io);
    const db = require('./database/db').getDB();
    io.on('connection', (socket) => {
      socket.on('authenticate', (userId) => {
        socket.userId = userId;
        socket.join(`user_${userId}`);
        socket.broadcast.emit('user_online', { userId });
      });
      socket.on('join_room', ({ roomId }) => socket.join(roomId));
      socket.on('send_message', ({ roomId, senderId, receiverId, content, type = 'text' }) => {
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4(), now = new Date().toISOString();
        try {
          db.prepare('INSERT INTO messages (id,sender_id,receiver_id,content,type,read,created_at) VALUES (?,?,?,?,?,0,?)')
            .run(id, senderId, receiverId, content, type, now);
          io.to(roomId).emit('message_received', { id, senderId, receiverId, content, type, read: false, createdAt: now });
          io.to(`user_${receiverId}`).emit('notification', { type: 'new_message', payload: { senderId, roomId } });
          db.prepare('INSERT INTO notifications (id,user_id,type,payload_json,read,created_at) VALUES (?,?,?,?,0,?)')
            .run(uuidv4(), receiverId, 'new_message', JSON.stringify({ senderId, roomId }), now);
        } catch (e) { console.error('msg err:', e); }
      });
      socket.on('typing',      ({ roomId, userId }) => socket.to(roomId).emit('user_typing',      { userId }));
      socket.on('stop_typing', ({ roomId, userId }) => socket.to(roomId).emit('user_stop_typing', { userId }));
      socket.on('disconnect',  () => { if (socket.userId) socket.broadcast.emit('user_offline', { userId: socket.userId }); });
    });
  } catch (e) {
    console.error('Socket.io init error:', e.message);
  }
}

// ── Start server (local only — Vercel provides its own HTTP) ─
if (!IS_SERVERLESS) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🚀 SkillSwap running at http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
