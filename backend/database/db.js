const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database/skillswap.db';
let db;

function getDB() {
  if (!db) {
    db = new DatabaseSync(path.resolve(__dirname, '..', DB_PATH.replace('./database/', '')));
    db.exec('PRAGMA journal_mode = WAL');
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
}

module.exports = { getDB, initDB };
