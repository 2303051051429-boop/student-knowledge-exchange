/* ═══════════════════════════════════════════════════
   LEADERBOARD JS (leaderboard.js)
═══════════════════════════════════════════════════ */

let currentPeriod = 'alltime';

document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
});

function switchTab(period) {
  currentPeriod = period;
  document.querySelectorAll('.auth-tab[data-period]').forEach(t => {
    t.classList.toggle('active', t.dataset.period === period);
  });
  loadLeaderboard();
}

async function loadLeaderboard() {
  const container = document.getElementById('leaderboardContent');
  container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="skeleton" style="width:100%;max-width:600px;height:400px;margin:0 auto;"></div></div>';
  
  try {
    const data = await SkillSwapAPI.get(`/leaderboard?period=${currentPeriod}`);
    renderLeaderboard(data.leaderboard);
  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--accent-rose);">Failed to load leaderboard</div>`;
  }
}

function renderLeaderboard(list) {
  const container = document.getElementById('leaderboardContent');
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--ink-faint);font-style:italic;">No data available yet</div>`;
    return;
  }
  
  let html = '';
  
  // Podium for top 3
  if (list.length >= 3) {
    const top3 = [list[1], list[0], list[2]]; // order: 2, 1, 3
    html += `<div class="podium-container">`;
    top3.forEach((u, i) => {
      const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
      const initials = u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const avatarHtml = u.avatar ? `<img src="${u.avatar}">` : initials;
      html += `
        <div class="podium-spot podium-${rank} stagger-children" style="animation-delay: ${i*0.2}s">
          <div class="podium-rank">#${rank}</div>
          <div class="podium-avatar">${avatarHtml}</div>
          <div class="podium-name">${u.name}</div>
          <div class="podium-xp">${u.xp} XP</div>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  // List for the rest
  html += `<div class="leaderboard-list">`;
  const startIdx = list.length >= 3 ? 3 : 0;
  for (let i = startIdx; i < list.length; i++) {
    const u = list[i];
    const rank = i + 1;
    const initials = u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const avatarHtml = u.avatar ? `<img src="${u.avatar}">` : initials;
    
    html += `
      <div class="lb-row stagger-children">
        <div class="lb-rank">#${rank}</div>
        <div class="lb-avatar">${avatarHtml}</div>
        <div class="lb-info">
          <div class="lb-name">${u.name}</div>
          <div class="lb-uni">${u.university || ''}</div>
        </div>
        <div class="lb-stats">
          <div class="lb-xp">${u.xp} XP</div>
          <div class="lb-badges">${u.sessions_taught} Sessions Taught</div>
        </div>
      </div>
    `;
  }
  html += `</div>`;
  
  container.innerHTML = html;
}

window.switchTab = switchTab;
