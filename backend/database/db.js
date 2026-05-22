const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config();

// On Vercel: use in-memory SQLite (:memory:) to avoid EROFS filesystem errors.
// Data auto-seeds on every cold start (demo data is always fresh).
// Locally: use a real file-based DB for persistence.
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);
const DB_FILE = IS_SERVERLESS ? ':memory:' : path.resolve(__dirname, 'skillswap.db');
let db;

function getDB() {
  if (!db) {
    db = new DatabaseSync(DB_FILE);
    // WAL requires write access beside the DB file — only safe locally.
    if (!IS_SERVERLESS) db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const database = getDB();

  database.exec(`
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      email        TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      university   TEXT,
      avatar       TEXT,
      bio          TEXT,
      credits      INTEGER DEFAULT 0,
      xp           INTEGER DEFAULT 0,
      sessions_taught  INTEGER DEFAULT 0,
      sessions_taken   INTEGER DEFAULT 0,
      avg_rating   REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      is_verified  INTEGER DEFAULT 0,
      created_at   TEXT NOT NULL
    );

    -- Skills (what a user can teach or wants to learn)
    CREATE TABLE IF NOT EXISTS skills (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id),
      name         TEXT NOT NULL,
      category     TEXT NOT NULL,
      type         TEXT NOT NULL CHECK(type IN ('teach','learn')),
      level        TEXT DEFAULT 'intermediate' CHECK(level IN ('beginner','intermediate','advanced')),
      price_per_hr INTEGER DEFAULT 0,
      is_swap      INTEGER DEFAULT 0,
      description  TEXT,
      created_at   TEXT NOT NULL
    );

    -- Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      teacher_id   TEXT NOT NULL REFERENCES users(id),
      learner_id   TEXT NOT NULL REFERENCES users(id),
      skill_id     TEXT REFERENCES skills(id),
      skill_name   TEXT NOT NULL,
      date         TEXT NOT NULL,
      time_slot    TEXT NOT NULL,
      duration_min INTEGER DEFAULT 60,
      status       TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
      meet_link    TEXT,
      notes        TEXT,
      price        INTEGER DEFAULT 0,
      created_at   TEXT NOT NULL
    );

    -- Reviews
    CREATE TABLE IF NOT EXISTS reviews (
      id           TEXT PRIMARY KEY,
      session_id   TEXT NOT NULL REFERENCES sessions(id),
      reviewer_id  TEXT NOT NULL REFERENCES users(id),
      reviewee_id  TEXT NOT NULL REFERENCES users(id),
      rating       INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment      TEXT,
      created_at   TEXT NOT NULL
    );

    -- Messages
    CREATE TABLE IF NOT EXISTS messages (
      id           TEXT PRIMARY KEY,
      sender_id    TEXT NOT NULL REFERENCES users(id),
      receiver_id  TEXT NOT NULL REFERENCES users(id),
      content      TEXT NOT NULL,
      type         TEXT DEFAULT 'text' CHECK(type IN ('text','image','meet_link','system')),
      read         INTEGER DEFAULT 0,
      created_at   TEXT NOT NULL
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id),
      type         TEXT NOT NULL,
      payload_json TEXT,
      read         INTEGER DEFAULT 0,
      created_at   TEXT NOT NULL
    );

    -- Challenges
    CREATE TABLE IF NOT EXISTS challenges (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL,
      xp_reward    INTEGER NOT NULL,
      badge_emoji  TEXT NOT NULL,
      target_count INTEGER DEFAULT 1,
      type         TEXT NOT NULL
    );

    -- User Challenges (progress)
    CREATE TABLE IF NOT EXISTS user_challenges (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id),
      challenge_id TEXT NOT NULL REFERENCES challenges(id),
      progress     INTEGER DEFAULT 0,
      completed    INTEGER DEFAULT 0,
      completed_at TEXT,
      UNIQUE(user_id, challenge_id)
    );
  `);

  console.log('✅ Database schema initialized');

  // Auto-seed demo data if DB is empty (handles Vercel/serverless cold starts)
  const userCount = database.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount.c === 0) {
    console.log('🌱 Auto-seeding demo data...');
    const bcrypt = require('bcryptjs');
    // Use cost 4 on serverless — cost 10 blocks ~400ms+ and risks cold-start timeout.
    const bcryptCost = IS_SERVERLESS ? 4 : 10;
    const password = bcrypt.hashSync('password123', bcryptCost);
    const now = new Date().toISOString();
    const users = [
      { id: 'u1',   name: 'Aryan Mehta',    email: 'aryan@iitb.ac.in',    university: 'IIT Bombay',       bio: 'CS student passionate about web dev & DSA.',         credits: 450, xp: 1240, sessions_taught: 84, avg_rating: 4.9, review_count: 84, is_verified: 1 },
      { id: 'u2',   name: 'Priya Sharma',   email: 'priya@du.ac.in',       university: 'Delhi University', bio: 'Music major. Teaching Hindustani vocals and guitar.', credits: 310, xp: 980,  sessions_taught: 62, avg_rating: 5.0, review_count: 62, is_verified: 1 },
      { id: 'u3',   name: 'Kenji Rao',      email: 'kenji@bits.ac.in',     university: 'BITS Pilani',      bio: 'Data Science + Japanese language enthusiast.',        credits: 220, xp: 760,  sessions_taught: 41, avg_rating: 4.7, review_count: 41, is_verified: 1 },
      { id: 'u4',   name: 'Sneha Kulkarni', email: 'sneha@coep.ac.in',     university: 'COEP Pune',        bio: 'UI/UX designer & Figma wizard.',                      credits: 180, xp: 590,  sessions_taught: 28, avg_rating: 4.8, review_count: 28, is_verified: 1 },
      { id: 'u5',   name: 'Rahul Gupta',    email: 'rahul@iitd.ac.in',     university: 'IIT Delhi',        bio: 'Competitive programmer and math olympiad medallist.', credits: 390, xp: 1100, sessions_taught: 73, avg_rating: 4.9, review_count: 73, is_verified: 1 },
      { id: 'u6',   name: 'Aisha Khan',     email: 'aisha@jadavpur.ac.in', university: 'Jadavpur Univ.',   bio: 'Photography & videography.',                          credits: 140, xp: 430,  sessions_taught: 19, avg_rating: 4.6, review_count: 19, is_verified: 0 },
      { id: 'u7',   name: 'Dev Anand',      email: 'dev@vit.ac.in',        university: 'VIT Vellore',      bio: 'Mobile developer (Flutter/React Native).',            credits: 260, xp: 820,  sessions_taught: 47, avg_rating: 4.8, review_count: 47, is_verified: 1 },
      { id: 'demo', name: 'Demo User',      email: 'demo@skillswap.com',   university: 'Demo University',  bio: 'Demo account. Explore all features!',                 credits: 100, xp: 200,  sessions_taught: 5,  avg_rating: 0,   review_count: 0,  is_verified: 0 },
    ];
    const insertUser = database.prepare(`INSERT INTO users (id,name,email,password_hash,university,bio,credits,xp,sessions_taught,avg_rating,review_count,is_verified,avatar,sessions_taken,created_at) VALUES (@id,@name,@email,@password_hash,@university,@bio,@credits,@xp,@sessions_taught,@avg_rating,@review_count,@is_verified,null,0,@created_at)`);
    for (const u of users) insertUser.run({ ...u, password_hash: password, created_at: now });
    const skills = [
      { id:'s1',  user_id:'u1', name:'React.js',         category:'Programming', type:'teach', level:'advanced',     price_per_hr:299, is_swap:0, description:'Hooks, Context, Redux, Performance' },
      { id:'s2',  user_id:'u1', name:'Node.js',           category:'Programming', type:'teach', level:'intermediate', price_per_hr:299, is_swap:0, description:'Express, REST APIs, JWT auth' },
      { id:'s3',  user_id:'u1', name:'DSA',               category:'Programming', type:'teach', level:'advanced',     price_per_hr:349, is_swap:0, description:'LeetCode patterns, interview prep' },
      { id:'s5',  user_id:'u2', name:'Hindustani Vocals', category:'Music',       type:'teach', level:'advanced',     price_per_hr:0,   is_swap:1, description:'Raag, taal, classical foundations' },
      { id:'s6',  user_id:'u2', name:'Guitar',            category:'Music',       type:'teach', level:'intermediate', price_per_hr:0,   is_swap:1, description:'Chords, strumming, lead basics' },
      { id:'s7',  user_id:'u2', name:'Music Theory',      category:'Music',       type:'teach', level:'advanced',     price_per_hr:149, is_swap:0, description:'Scales, modes, harmony' },
      { id:'s9',  user_id:'u3', name:'Python',            category:'Programming', type:'teach', level:'advanced',     price_per_hr:199, is_swap:0, description:'Data analysis, Pandas, NumPy' },
      { id:'s10', user_id:'u3', name:'Machine Learning',  category:'Programming', type:'teach', level:'advanced',     price_per_hr:249, is_swap:0, description:'Scikit-learn, model building' },
      { id:'s11', user_id:'u3', name:'Japanese',          category:'Languages',   type:'teach', level:'advanced',     price_per_hr:199, is_swap:0, description:'N5-N3 JLPT prep, conversational' },
      { id:'s12', user_id:'u4', name:'UI/UX Design',      category:'Design',      type:'teach', level:'advanced',     price_per_hr:249, is_swap:0, description:'Figma, design systems, user research' },
      { id:'s14', user_id:'u5', name:'Mathematics',       category:'Mathematics', type:'teach', level:'advanced',     price_per_hr:299, is_swap:0, description:'Calculus, linear algebra, probability' },
      { id:'s16', user_id:'u6', name:'Photography',       category:'Photography', type:'teach', level:'intermediate', price_per_hr:149, is_swap:0, description:'Composition, lighting, Lightroom' },
      { id:'s18', user_id:'u7', name:'Flutter',           category:'Programming', type:'teach', level:'advanced',     price_per_hr:299, is_swap:0, description:'Full app development, state management' },
    ];
    const insertSkill = database.prepare(`INSERT INTO skills (id,user_id,name,category,type,level,price_per_hr,is_swap,description,created_at) VALUES (@id,@user_id,@name,@category,@type,@level,@price_per_hr,@is_swap,@description,@created_at)`);
    for (const s of skills) insertSkill.run({ ...s, created_at: now });
    const challenges = [
      { id:'c1', title:'First Session',    description:'Complete your first teaching session', xp_reward:100, badge_emoji:'🎓', target_count:1,    type:'sessions_taught' },
      { id:'c2', title:'Popular Teacher',  description:'Teach 10 sessions total',              xp_reward:300, badge_emoji:'⭐', target_count:10,   type:'sessions_taught' },
      { id:'c3', title:'Knowledge Seeker', description:'Complete 5 learning sessions',         xp_reward:200, badge_emoji:'📚', target_count:5,    type:'sessions_taken'  },
      { id:'c4', title:'Perfect Score',    description:'Receive a 5-star review',              xp_reward:150, badge_emoji:'💫', target_count:1,    type:'five_star_review'},
      { id:'c5', title:'Chat Master',      description:'Send 50 messages on the platform',     xp_reward:100, badge_emoji:'💬', target_count:50,   type:'messages_sent'   },
      { id:'c6', title:'Skill Collector',  description:'List 3 skills you can teach',          xp_reward:200, badge_emoji:'🏅', target_count:3,    type:'skills_listed'   },
      { id:'c7', title:'Community Pillar', description:'Accumulate 1000 XP',                   xp_reward:500, badge_emoji:'🏆', target_count:1000, type:'xp_total'        },
    ];
    const insertChallenge = database.prepare(`INSERT INTO challenges (id,title,description,xp_reward,badge_emoji,target_count,type) VALUES (@id,@title,@description,@xp_reward,@badge_emoji,@target_count,@type)`);
    for (const c of challenges) insertChallenge.run(c);
    database.prepare(`INSERT INTO sessions (id,teacher_id,learner_id,skill_id,skill_name,date,time_slot,duration_min,status,meet_link,price,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run('sess1','u1','demo','s1','React.js','2026-06-25','10:00',60,'confirmed','https://meet.google.com/abc-defg-hij',299,'',now);
    database.prepare(`INSERT INTO messages (id,sender_id,receiver_id,content,type,read,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run('m1','u1','demo','Hey! Looking forward to our React session 🚀','text',0,now);
    console.log('✅ Demo data seeded! Login: demo@skillswap.com / password123');
  }
}

module.exports = { getDB, initDB };
