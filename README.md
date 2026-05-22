# 🎓 Student Knowledge Exchange

> **Peer-to-peer skill trading for college students.**  
> Learn Python. Teach Guitar. No professor required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite-blue)](https://sqlite.org)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-black)](https://socket.io)

---

## ✨ What is this?

**Student Knowledge Exchange** (SkillSwap) is a full-stack peer learning platform where students teach each other skills, book live sessions, chat in real-time, earn XP, and climb a leaderboard — all without a professor.

---

## 🖼️ Features

| Feature | Description |
|---|---|
| 🔍 **Explore Skills** | Browse teachers by skill, category, price, or rating |
| 📅 **Book Sessions** | Schedule 1-on-1 sessions with auto-generated Google Meet links |
| 💬 **Real-time Chat** | Socket.io powered messaging with typing indicators |
| 🏆 **Leaderboard** | Earn XP, unlock badges, and compete with peers |
| 🎯 **Smart Matching** | Algorithm pairs students based on complementary skills |
| 🔐 **Auth System** | JWT-based login/signup with bcrypt password hashing |
| 📊 **Dashboard** | Track sessions taught/taken, XP progress, and challenges |

---

## 🗂️ Project Structure

```
student-knowledge-exchange/
├── frontend/                  # Vanilla HTML + CSS + JS
│   ├── index.html             # Landing page
│   ├── explore.html           # Browse skills & teachers
│   ├── dashboard.html         # User dashboard
│   ├── messages.html          # Real-time chat
│   ├── leaderboard.html       # XP leaderboard
│   ├── styles/
│   │   ├── main.css           # Design system & tokens
│   │   ├── modal.css          # Booking & auth modals
│   │   ├── animations.css     # Micro-animations
│   │   ├── dashboard.css      # Dashboard layout
│   │   └── chat.css           # Chat UI styles
│   └── js/
│       ├── api.js             # Fetch wrapper for backend API
│       ├── auth.js            # Auth state management
│       ├── booking.js         # Booking modal logic
│       ├── main.js            # Global scripts
│       ├── explore.js         # Explore page logic
│       ├── dashboard.js       # Dashboard logic
│       ├── chat.js            # Socket.io chat client
│       └── leaderboard.js     # Leaderboard logic
│
└── backend/                   # Node.js + Express + Socket.io
    ├── server.js              # Entry point
    ├── database/
    │   ├── db.js              # SQLite init (node:sqlite)
    │   └── seed.js            # Mock data seeder
    ├── routes/
    │   ├── auth.js            # POST /api/auth/register|login
    │   ├── users.js           # GET|PUT /api/users/:id
    │   ├── skills.js          # GET /api/skills
    │   ├── sessions.js        # POST|GET /api/sessions
    │   ├── messages.js        # GET /api/messages
    │   ├── reviews.js         # POST /api/reviews
    │   ├── notifications.js   # GET /api/notifications
    │   ├── matching.js        # GET /api/match
    │   ├── challenges.js      # GET /api/challenges
    │   └── leaderboard.js     # GET /api/leaderboard
    ├── middleware/
    │   └── auth.js            # JWT verification middleware
    └── utils/
        └── notificationHelper.js  # Socket.io notification helpers
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js v18+** (uses built-in `node:sqlite` — no native compilation needed)
- **npm**

### 1. Clone the repo
```bash
git clone https://github.com/2303051051429-boop/student-knowledge-exchange.git
cd student-knowledge-exchange
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
Create `backend/.env`:
```env
PORT=3000
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 4. Seed the database (optional — loads mock data)
```bash
npm run seed
```

### 5. Start the server
```bash
npm start
```

> The server serves both the **API** and the **frontend** from port `3000`.  
> Visit → [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tech Stack

**Frontend**
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- Playfair Display + Lora fonts (Google Fonts)
- Socket.io Client (CDN)

**Backend**
- Node.js (v18+) + Express.js
- SQLite via built-in `node:sqlite` (no native binaries)
- Socket.io (real-time messaging)
- JWT + bcryptjs (auth)
- Multer (file uploads)
- express-validator (input validation)
- express-rate-limit (rate limiting)

---

## 🌐 API Reference

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & receive JWT |
| GET | `/api/skills` | Browse skills (with filters) |
| GET | `/api/skills/categories` | List all categories |
| POST | `/api/sessions` | Book a session |
| GET | `/api/sessions/my` | My sessions |
| GET | `/api/messages` | Conversations list |
| GET | `/api/messages/:partnerId` | Chat history |
| GET | `/api/leaderboard` | XP leaderboard |
| GET | `/api/challenges` | Challenges & badges |
| GET | `/api/match` | Smart peer matching |

---

## 📸 Screenshots

| Landing Page | Explore | Dashboard |
|---|---|---|
| Premium serif hero with animated typewriter | Filter teachers by skill/price/rating | XP bar, sessions, challenges |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Rupesh Devda** · [GitHub](https://github.com/2303051051429-boop)

> *Built with ☕ and the belief that students are the best teachers.*
