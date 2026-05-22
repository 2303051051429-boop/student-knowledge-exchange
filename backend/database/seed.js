require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDB, initDB } = require('./db');

initDB();
const db = getDB();

console.log('🌱 Seeding database...');

// Clear existing data
db.exec(`
  DELETE FROM user_challenges;
  DELETE FROM challenges;
  DELETE FROM notifications;
  DELETE FROM messages;
  DELETE FROM reviews;
  DELETE FROM sessions;
  DELETE FROM skills;
  DELETE FROM users;
`);

// ── Users ────────────────────────────────────────────────────
const password = bcrypt.hashSync('password123', 10);
const now = new Date().toISOString();

const users = [
  { id: 'u1', name: 'Aryan Mehta',    email: 'aryan@iitb.ac.in',     university: 'IIT Bombay',      bio: 'CS student passionate about web dev & DSA. Cracked 3 internships!',          credits: 450, xp: 1240, sessions_taught: 84, avg_rating: 4.9, review_count: 84, is_verified: 1, avatar: null },
  { id: 'u2', name: 'Priya Sharma',   email: 'priya@du.ac.in',        university: 'Delhi University', bio: 'Music major. Teaching Hindustani vocals and guitar since 2021.',              credits: 310, xp: 980,  sessions_taught: 62, avg_rating: 5.0, review_count: 62, is_verified: 1, avatar: null },
  { id: 'u3', name: 'Kenji Rao',      email: 'kenji@bits.ac.in',      university: 'BITS Pilani',      bio: 'Data Science + Japanese language enthusiast. ML intern at a unicorn startup.', credits: 220, xp: 760,  sessions_taught: 41, avg_rating: 4.7, review_count: 41, is_verified: 1, avatar: null },
  { id: 'u4', name: 'Sneha Kulkarni', email: 'sneha@coep.ac.in',      university: 'COEP Pune',        bio: 'UI/UX designer & Figma wizard. Love helping engineers think visually.',         credits: 180, xp: 590,  sessions_taught: 28, avg_rating: 4.8, review_count: 28, is_verified: 1, avatar: null },
  { id: 'u5', name: 'Rahul Gupta',    email: 'rahul@iitd.ac.in',      university: 'IIT Delhi',        bio: 'Competitive programmer and mathematics olympiad medallist.',                   credits: 390, xp: 1100, sessions_taught: 73, avg_rating: 4.9, review_count: 73, is_verified: 1, avatar: null },
  { id: 'u6', name: 'Aisha Khan',     email: 'aisha@jadavpur.ac.in',  university: 'Jadavpur Univ.',   bio: 'Photography & videography. Shoot for the university magazine.',                credits: 140, xp: 430,  sessions_taught: 19, avg_rating: 4.6, review_count: 19, is_verified: 0, avatar: null },
  { id: 'u7', name: 'Dev Anand',      email: 'dev@vit.ac.in',         university: 'VIT Vellore',      bio: 'Mobile developer (Flutter/React Native). 5 apps on Play Store.',              credits: 260, xp: 820,  sessions_taught: 47, avg_rating: 4.8, review_count: 47, is_verified: 1, avatar: null },
  { id: 'demo', name: 'Demo User',    email: 'demo@skillswap.com',    university: 'Demo University',  bio: 'This is the demo account. Explore all features!',                            credits: 100, xp: 200,  sessions_taught: 5,  avg_rating: 0,   review_count: 0,  is_verified: 0, avatar: null },
];

const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password_hash, university, bio, credits, xp, sessions_taught, avg_rating, review_count, is_verified, avatar, sessions_taken, created_at)
  VALUES (@id, @name, @email, @password_hash, @university, @bio, @credits, @xp, @sessions_taught, @avg_rating, @review_count, @is_verified, @avatar, 0, @created_at)
`);

for (const u of users) {
  insertUser.run({ ...u, password_hash: password, created_at: now });
}
console.log(`✅ ${users.length} users inserted`);

// ── Skills ───────────────────────────────────────────────────
const skills = [
  // Aryan teaches
  { id: 's1',  user_id: 'u1', name: 'React.js',         category: 'Programming', type: 'teach', level: 'advanced',     price_per_hr: 299, is_swap: 0, description: 'Hooks, Context, Redux, Performance' },
  { id: 's2',  user_id: 'u1', name: 'Node.js',           category: 'Programming', type: 'teach', level: 'intermediate', price_per_hr: 299, is_swap: 0, description: 'Express, REST APIs, JWT auth' },
  { id: 's3',  user_id: 'u1', name: 'DSA',               category: 'Programming', type: 'teach', level: 'advanced',     price_per_hr: 349, is_swap: 0, description: 'LeetCode patterns, interview prep' },
  { id: 's4',  user_id: 'u1', name: 'Guitar',            category: 'Music',       type: 'learn', level: 'beginner',     price_per_hr: 0,   is_swap: 1, description: 'Want to learn basics' },
  // Priya teaches
  { id: 's5',  user_id: 'u2', name: 'Hindustani Vocals', category: 'Music',       type: 'teach', level: 'advanced',     price_per_hr: 0,   is_swap: 1, description: 'Raag, taal, classical foundations' },
  { id: 's6',  user_id: 'u2', name: 'Guitar',            category: 'Music',       type: 'teach', level: 'intermediate', price_per_hr: 0,   is_swap: 1, description: 'Chords, strumming, lead basics' },
  { id: 's7',  user_id: 'u2', name: 'Music Theory',      category: 'Music',       type: 'teach', level: 'advanced',     price_per_hr: 149, is_swap: 0, description: 'Scales, modes, harmony' },
  { id: 's8',  user_id: 'u2', name: 'Python',            category: 'Programming', type: 'learn', level: 'beginner',     price_per_hr: 0,   is_swap: 1, description: 'Wants to learn data analysis' },
  // Kenji teaches
  { id: 's9',  user_id: 'u3', name: 'Python',            category: 'Programming', type: 'teach', level: 'advanced',     price_per_hr: 199, is_swap: 0, description: 'Data analysis, Pandas, NumPy' },
  { id: 's10', user_id: 'u3', name: 'Machine Learning',  category: 'Programming', type: 'teach', level: 'advanced',     price_per_hr: 249, is_swap: 0, description: 'Scikit-learn, model building, deployment' },
  { id: 's11', user_id: 'u3', name: 'Japanese',          category: 'Languages',   type: 'teach', level: 'advanced',     price_per_hr: 199, is_swap: 0, description: 'N5-N3 JLPT prep, conversational' },
  // Sneha teaches
  { id: 's12', user_id: 'u4', name: 'UI/UX Design',      category: 'Design',      type: 'teach', level: 'advanced',     price_per_hr: 249, is_swap: 0, description: 'Figma, design systems, user research' },
  { id: 's13', user_id: 'u4', name: 'Figma',             category: 'Design',      type: 'teach', level: 'advanced',     price_per_hr: 199, is_swap: 0, description: 'Components, auto-layout, prototyping' },
  // Rahul teaches
  { id: 's14', user_id: 'u5', name: 'Mathematics',       category: 'Mathematics', type: 'teach', level: 'advanced',     price_per_hr: 299, is_swap: 0, description: 'Calculus, linear algebra, probability' },
  { id: 's15', user_id: 'u5', name: 'Competitive Prog.', category: 'Programming', type: 'teach', level: 'advanced',     price_per_hr: 349, is_swap: 0, description: 'Codeforces, ICPC prep, advanced algorithms' },
  // Aisha teaches
  { id: 's16', user_id: 'u6', name: 'Photography',       category: 'Photography', type: 'teach', level: 'intermediate', price_per_hr: 149, is_swap: 0, description: 'Composition, lighting, editing in Lightroom' },
  { id: 's17', user_id: 'u6', name: 'Video Editing',     category: 'Design',      type: 'teach', level: 'intermediate', price_per_hr: 179, is_swap: 0, description: 'Premiere Pro basics to intermediate' },
  // Dev teaches
  { id: 's18', user_id: 'u7', name: 'Flutter',           category: 'Programming', type: 'teach', level: 'advanced',     price_per_hr: 299, is_swap: 0, description: 'Full app development, state management' },
  { id: 's19', user_id: 'u7', name: 'React Native',      category: 'Programming', type: 'teach', level: 'intermediate', price_per_hr: 249, is_swap: 0, description: 'Cross-platform mobile development' },
];

const insertSkill = db.prepare(`
  INSERT INTO skills (id, user_id, name, category, type, level, price_per_hr, is_swap, description, created_at)
  VALUES (@id, @user_id, @name, @category, @type, @level, @price_per_hr, @is_swap, @description, @created_at)
`);
for (const s of skills) insertSkill.run({ ...s, created_at: now });
console.log(`✅ ${skills.length} skills inserted`);

// ── Sessions ─────────────────────────────────────────────────
const sessions = [
  { id: 'sess1', teacher_id: 'u1', learner_id: 'demo', skill_id: 's1', skill_name: 'React.js',   date: '2026-05-25', time_slot: '10:00', duration_min: 60, status: 'confirmed', meet_link: 'https://meet.google.com/abc-defg-hij', price: 299, notes: 'Bring your laptop', created_at: now },
  { id: 'sess2', teacher_id: 'u3', learner_id: 'demo', skill_id: 's9', skill_name: 'Python',      date: '2026-05-28', time_slot: '14:00', duration_min: 60, status: 'pending',   meet_link: 'https://meet.google.com/xyz-uvwx-yzz', price: 199, notes: '', created_at: now },
  { id: 'sess3', teacher_id: 'u1', learner_id: 'u3',   skill_id: 's3', skill_name: 'DSA',         date: '2026-05-20', time_slot: '11:00', duration_min: 90, status: 'completed', meet_link: 'https://meet.google.com/past-sess-001', price: 349, notes: '', created_at: now },
];

const insertSession = db.prepare(`
  INSERT INTO sessions (id, teacher_id, learner_id, skill_id, skill_name, date, time_slot, duration_min, status, meet_link, price, notes, created_at)
  VALUES (@id, @teacher_id, @learner_id, @skill_id, @skill_name, @date, @time_slot, @duration_min, @status, @meet_link, @price, @notes, @created_at)
`);
for (const s of sessions) insertSession.run(s);
console.log(`✅ ${sessions.length} sessions inserted`);

// ── Reviews ──────────────────────────────────────────────────
const insertReview = db.prepare(`
  INSERT INTO reviews (id, session_id, reviewer_id, reviewee_id, rating, comment, created_at)
  VALUES (@id, @session_id, @reviewer_id, @reviewee_id, @rating, @comment, @created_at)
`);
insertReview.run({ id: 'r1', session_id: 'sess3', reviewer_id: 'u3', reviewee_id: 'u1', rating: 5, comment: 'Aryan is an incredible teacher! Explained every concept with patience.', created_at: now });
console.log(`✅ 1 review inserted`);

// ── Challenges ───────────────────────────────────────────────
const challenges = [
  { id: 'c1', title: 'First Session',     description: 'Complete your very first teaching session',     xp_reward: 100, badge_emoji: '🎓', target_count: 1,  type: 'sessions_taught' },
  { id: 'c2', title: 'Popular Teacher',   description: 'Teach 10 sessions total',                       xp_reward: 300, badge_emoji: '⭐', target_count: 10, type: 'sessions_taught' },
  { id: 'c3', title: 'Knowledge Seeker',  description: 'Complete 5 learning sessions',                  xp_reward: 200, badge_emoji: '📚', target_count: 5,  type: 'sessions_taken'  },
  { id: 'c4', title: 'Perfect Score',     description: 'Receive a 5-star review',                       xp_reward: 150, badge_emoji: '💫', target_count: 1,  type: 'five_star_review'},
  { id: 'c5', title: 'Chat Master',       description: 'Send 50 messages in the platform',              xp_reward: 100, badge_emoji: '💬', target_count: 50, type: 'messages_sent'   },
  { id: 'c6', title: 'Skill Collector',   description: 'List 3 skills you can teach',                   xp_reward: 200, badge_emoji: '🏅', target_count: 3,  type: 'skills_listed'   },
  { id: 'c7', title: 'Community Pillar',  description: 'Accumulate 1000 XP',                            xp_reward: 500, badge_emoji: '🏆', target_count: 1000, type: 'xp_total'      },
];

const insertChallenge = db.prepare(`
  INSERT INTO challenges (id, title, description, xp_reward, badge_emoji, target_count, type)
  VALUES (@id, @title, @description, @xp_reward, @badge_emoji, @target_count, @type)
`);
for (const c of challenges) insertChallenge.run(c);
console.log(`✅ ${challenges.length} challenges inserted`);

// ── Messages (demo conversation) ────────────────────────────
const msgs = [
  { id: 'm1', sender_id: 'u1', receiver_id: 'demo', content: 'Hey! Looking forward to our React session on the 25th 🚀', type: 'text', read: 0, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'm2', sender_id: 'demo', receiver_id: 'u1', content: 'Me too! Should I bring any specific files?', type: 'text', read: 1, created_at: new Date(Date.now() - 3500000).toISOString() },
  { id: 'm3', sender_id: 'u1', receiver_id: 'demo', content: 'Just have VS Code ready with Node.js installed. I\'ll share the Meet link 30 mins before.', type: 'text', read: 0, created_at: new Date(Date.now() - 1800000).toISOString() },
];
const insertMsg = db.prepare(`INSERT INTO messages (id, sender_id, receiver_id, content, type, read, created_at) VALUES (@id, @sender_id, @receiver_id, @content, @type, @read, @created_at)`);
for (const m of msgs) insertMsg.run(m);
console.log(`✅ ${msgs.length} messages inserted`);

console.log('\n🎉 Database seeded successfully!');
console.log('📧 Demo login: demo@skillswap.com / password123');
process.exit(0);
