/* ═══════════════════════════════════════════════════
   DASHBOARD JS (dashboard.js)
═══════════════════════════════════════════════════ */

let currentUser = null;
let allSessions = { upcoming: [], past: [], cancelled: [] };
let currentSessionTab = 'upcoming';

document.addEventListener('DOMContentLoaded', async () => {
  if (!SkillSwapAPI.isLoggedIn()) { window.location.href = '/'; return; }
  
  try {
    const data = await SkillSwapAPI.me();
    currentUser = data.user;
    renderProfile();
    renderOverviewStats();
    loadSessions();
    loadChallenges();
    populateSettingsForm();
  } catch (err) {
    console.error(err);
    window.location.href = '/';
  }
});

function renderProfile() {
  const initials = currentUser.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const avatarHtml = currentUser.avatar ? `<img src="${currentUser.avatar}">` : initials;
  
  document.getElementById('dashAvatar').innerHTML = avatarHtml;
  document.getElementById('dashName').textContent = currentUser.name;
  document.getElementById('dashUni').textContent = currentUser.university || 'No university specified';
  
  // XP Calculation (Next tier every 500 XP)
  const xp = currentUser.xp || 0;
  const currentTier = Math.floor(xp / 500);
  const nextTierXP = (currentTier + 1) * 500;
  const progressPct = (xp % 500) / 500 * 100;
  
  document.getElementById('dashXpVal').textContent = `${xp} / ${nextTierXP} XP`;
  setTimeout(() => { document.getElementById('dashXpFill').style.width = `${progressPct}%`; }, 100);
}

function renderOverviewStats() {
  document.getElementById('welcomeTitle').innerHTML = `Welcome back, <em>${currentUser.name.split(' ')[0]}</em>`;
  document.getElementById('statTaught').textContent = currentUser.sessions_taught || 0;
  document.getElementById('statTaken').textContent = currentUser.sessions_taken || 0;
  document.getElementById('statRating').textContent = (currentUser.avg_rating || 0).toFixed(1);
  document.getElementById('statCredits').textContent = currentUser.credits || 0;
}

function switchPanel(panelId) {
  document.querySelectorAll('.dash-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.dash-nav-item[data-target="${panelId}"]`).classList.add('active');
  
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${panelId}`).classList.add('active');
}

async function loadSessions() {
  try {
    allSessions = await SkillSwapAPI.get('/sessions/my');
    renderNextSession();
    renderSessionList();
  } catch (err) {
    console.error(err);
  }
}

function renderNextSession() {
  const container = document.getElementById('nextSessionContainer');
  if (allSessions.upcoming.length === 0) {
    container.innerHTML = `<div class="card" style="padding:20px;text-align:center;color:var(--ink-faint);font-style:italic;">No upcoming sessions</div>`;
    return;
  }
  
  const next = allSessions.upcoming[0]; // Assuming API sorts ASC by date/time
  const partnerName = next.teacher_id === currentUser.id ? next.learner_name : next.teacher_name;
  const partnerAvatar = next.teacher_id === currentUser.id ? next.learner_avatar : next.teacher_avatar;
  const initials = partnerName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const avatarHtml = partnerAvatar ? `<img src="${partnerAvatar}">` : initials;
  const dateStr = new Date(next.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
  
  container.innerHTML = `
    <div style="background:var(--ink-primary);border-radius:10px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="session-avatar">${avatarHtml}</div>
        <div>
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:#fff;margin-bottom:4px;">${next.skill_name} with ${partnerName}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:rgba(255,255,255,.45);letter-spacing:1px;">${dateStr} @ ${next.time_slot}</div>
        </div>
      </div>
      <div>
        <a href="${next.meet_link}" target="_blank" class="btn-primary btn-sm btn-teal">Join Meet</a>
      </div>
    </div>
  `;
}

function switchSessionTab(tab) {
  currentSessionTab = tab;
  document.querySelectorAll('.auth-tab[data-stab]').forEach(t => t.classList.toggle('active', t.dataset.stab === tab));
  renderSessionList();
}

function renderSessionList() {
  const list = allSessions[currentSessionTab];
  const container = document.getElementById('sessionsListContainer');
  
  if (list.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--ink-faint);font-style:italic;">No ${currentSessionTab} sessions found.</div>`;
    return;
  }
  
  container.innerHTML = list.map(s => {
    const isTeacher = s.teacher_id === currentUser.id;
    const partnerName = isTeacher ? s.learner_name : s.teacher_name;
    const partnerAvatar = isTeacher ? s.learner_avatar : s.teacher_avatar;
    const initials = partnerName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const avatarHtml = partnerAvatar ? `<img src="${partnerAvatar}">` : initials;
    const dateStr = new Date(s.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
    
    let actions = '';
    if (s.status === 'pending' || s.status === 'confirmed') {
      actions += `<a href="${s.meet_link}" target="_blank" class="session-btn btn-teal" style="text-decoration:none;display:inline-block;">Meet Link</a>`;
      if (isTeacher) actions += `<button class="session-btn" style="background:var(--ink-primary);color:#fff;" onclick="updateSessionStatus('${s.id}', 'completed')">Mark Done</button>`;
      actions += `<button class="session-btn" style="background:none;border:1px solid var(--card-border);color:var(--accent-rose);" onclick="updateSessionStatus('${s.id}', 'cancelled')">Cancel</button>`;
    }
    
    return `
      <div class="session-card stagger-children">
        <div class="session-avatar">${avatarHtml}</div>
        <div class="session-info">
          <div class="session-skill-name">${s.skill_name}</div>
          <div class="session-meta">
            <span>with ${partnerName}</span>
            <span>·</span>
            <span>${dateStr} @ ${s.time_slot}</span>
          </div>
          <div style="margin-top:8px;">
            <span class="session-status status-${s.status}">${s.status}</span>
          </div>
        </div>
        <div class="session-actions">
          ${actions}
        </div>
      </div>
    `;
  }).join('');
}

async function updateSessionStatus(id, status) {
  if (!confirm(`Are you sure you want to mark this session as ${status}?`)) return;
  try {
    await SkillSwapAPI.patch(`/sessions/${id}/status`, { status });
    showToast(`Session marked as ${status}`, 'success');
    loadSessions(); // Reload
  } catch (err) {
    showToast(err.error || 'Failed to update session', 'error');
  }
}

async function loadChallenges() {
  try {
    const res = await SkillSwapAPI.get('/challenges');
    const grid = document.getElementById('badgesGrid');
    
    grid.innerHTML = res.challenges.map(c => {
      const cls = c.completed ? 'earned' : 'locked';
      const pct = Math.min((c.userProgress / c.target_count) * 100, 100);
      return `
        <div class="badge-card ${cls} stagger-children">
          <div class="badge-emoji">${c.badge_emoji}</div>
          <div class="badge-title">${c.title}</div>
          <div class="badge-xp">+${c.xp_reward} XP</div>
          <div class="badge-progress">
            <div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${pct}%"></div></div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {}
}

function populateSettingsForm() {
  document.getElementById('set-name').value = currentUser.name || '';
  document.getElementById('set-uni').value = currentUser.university || '';
  document.getElementById('set-bio').value = currentUser.bio || '';
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const name = document.getElementById('set-name').value.trim();
  const university = document.getElementById('set-uni').value.trim();
  const bio = document.getElementById('set-bio').value.trim();
  
  try {
    const res = await SkillSwapAPI.put(`/users/${currentUser.id}`, { name, university, bio });
    currentUser = res.user;
    SkillSwapAPI.setUser(currentUser);
    renderProfile();
    showToast('Profile updated!', 'success');
  } catch (err) {
    showToast('Failed to update profile', 'error');
  }
}

window.switchPanel = switchPanel;
window.switchSessionTab = switchSessionTab;
window.updateSessionStatus = updateSessionStatus;
window.handleSaveSettings = handleSaveSettings;
