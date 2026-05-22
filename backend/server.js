require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Route imports
const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const skillsRoutes       = require('./routes/skills');
const sessionsRoutes     = require('./routes/sessions');
const reviewsRoutes      = require('./routes/reviews');
const messagesRoutes     = require('./routes/messages');
const notificationsRoutes= require('./routes/notifications');
const matchingRoutes     = require('./routes/matching');
const challengesRoutes   = require('./routes/challenges');
const leaderboardRoutes  = require('./routes/leaderboard');

// DB bootstrap
const { initDB } = require('./database/db');
initDB();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded avatars — use /tmp on Vercel (bundle dir is read-only)
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);
const uploadDir = IS_SERVERLESS
  ? '/tmp/uploads'
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Note: frontend is served as static assets by Vercel CDN directly.
// Express only handles /api/* routes in production.
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
}


// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/skills',        skillsRoutes);
app.use('/api/sessions',      sessionsRoutes);
app.use('/api/reviews',       reviewsRoutes);
app.use('/api/messages',      messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/match',         matchingRoutes);
app.use('/api/challenges',    challengesRoutes);
app.use('/api/leaderboard',   leaderboardRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// SPA fallback — only when running locally (Vercel handles routing via vercel.json)
if (!process.env.VERCEL) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });
}

// ── Socket.io Real-time ─────────────────────────────────────
const { initSocket } = require('./utils/notificationHelper');
initSocket(io);

const db = require('./database/db').getDB();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Auth: associate socket with user
  socket.on('authenticate', (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} authenticated on socket`);
    // Broadcast online status
    socket.broadcast.emit('user_online', { userId });
  });

  // Join private chat room
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
    console.log(`💬 Socket ${socket.id} joined room ${roomId}`);
  });

  // Send message
  socket.on('send_message', ({ roomId, senderId, receiverId, content, type = 'text' }) => {
    const { v4: uuidv4 } = require('uuid');
    const msgId = uuidv4();
    const now   = new Date().toISOString();

    try {
      db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, content, type, read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).run(msgId, senderId, receiverId, content, type, now);

      const message = { id: msgId, senderId, receiverId, content, type, read: false, createdAt: now };

      // Emit to room
      io.to(roomId).emit('message_received', message);

      // Push notification to receiver
      io.to(`user_${receiverId}`).emit('notification', {
        type: 'new_message',
        message: `New message from a peer`,
        payload: { senderId, roomId }
      });

      // Persist notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, payload_json, read, created_at)
        VALUES (?, ?, 'new_message', ?, 0, ?)
      `).run(uuidv4(), receiverId, JSON.stringify({ senderId, roomId }), now);

    } catch (err) {
      console.error('Message save error:', err);
    }
  });

  // Typing indicators
  socket.on('typing',      ({ roomId, userId }) => socket.to(roomId).emit('user_typing',      { userId }));
  socket.on('stop_typing', ({ roomId, userId }) => socket.to(roomId).emit('user_stop_typing', { userId }));

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) socket.broadcast.emit('user_offline', { userId: socket.userId });
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── Start ───────────────────────────────────────────────────
// On Vercel: do NOT call server.listen() — Vercel provides its own HTTP server.
// Export app so Vercel can invoke it as a serverless handler.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🚀 SkillSwap server running at http://localhost:${PORT}`);
    console.log(`📡 Socket.io enabled`);
    console.log(`🗄️  Database: SQLite`);
    console.log(`📁 Frontend: http://localhost:${PORT}\n`);
  });
}

module.exports = { app, server, io };
