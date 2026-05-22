/* ═══════════════════════════════════════════════════
   MAIN.JS — Landing page scripts
   Custom cursor, typewriter, scroll reveal, counters,
   search, 3D tilt, scroll progress, parallax
═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initScrollProgress();
  initReveal();
  initCounters();
  initTypewriter();
  initTilt();
  initActiveNav();
  updateNavAuth();
});

// ── Custom Cursor ───────────────────────────────────
function initCursor() {
  if ('ontouchstart' in window) return;
  document.body.style.cursor = 'none';
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function loop() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    dot.style.left = `${mx}px`;  dot.style.top  = `${my}px`;
    ring.style.left = `${rx}px`; ring.style.top = `${ry}px`;
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll('a, button, .cat-card, .teacher-card, .session-card, input, textarea, select, .slot-btn, .cal-day, .dash-nav-item, .chat-item').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });
}

// ── Scroll Progress Bar ─────────────────────────────
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = h > 0 ? `${(window.scrollY / h) * 100}%` : '0%';
  });
}

// ── Scroll Reveal ───────────────────────────────────
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }});
  }, { threshold: 0.15 });
  reveals.forEach(el => observer.observe(el));
}

// ── Stats Counter Animation ─────────────────────────
function initCounters() {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const isFloat = target % 1 !== 0;
      const duration = 2000;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = eased * target;
        el.textContent = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = isFloat ? target.toFixed(1) : target.toLocaleString();
      }
      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

// ── Typewriter Effect ───────────────────────────────
function initTypewriter() {
  const el = document.getElementById('typewriter');
  if (!el) return;
  const phrases = ['Learn Python.', 'Teach Guitar.', 'Master React.', 'Speak Japanese.', 'Design in Figma.', 'Crack DSA.', 'Learn Photography.'];
  let phraseIdx = 0, charIdx = 0, deleting = false;

  function tick() {
    const phrase = phrases[phraseIdx];
    if (deleting) {
      charIdx--;
      el.textContent = phrase.substring(0, charIdx);
      if (charIdx === 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; setTimeout(tick, 400); return; }
      setTimeout(tick, 40);
    } else {
      charIdx++;
      el.textContent = phrase.substring(0, charIdx);
      if (charIdx === phrase.length) { deleting = true; setTimeout(tick, 2000); return; }
      setTimeout(tick, 80);
    }
  }
  setTimeout(tick, 1500);
}

// ── 3D Tilt on Teacher Cards ────────────────────────
function initTilt() {
  document.querySelectorAll('.teacher-card, .tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-8px) perspective(600px) rotateX(${-y*6}deg) rotateY(${x*6}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// ── Active Nav Highlighting ─────────────────────────
function initActiveNav() {
  const sections = document.querySelectorAll('[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  if (!navLinks.length) return;

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 200) current = s.id; });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));
  });
}

// ── Hero Search Handler ─────────────────────────────
function handleSearch() {
  const q = document.getElementById('heroSearch')?.value?.trim();
  if (q) window.location.href = `/explore.html?q=${encodeURIComponent(q)}`;
  else   window.location.href = '/explore.html';
}
window.handleSearch = handleSearch;

// ── Notification Panel ──────────────────────────────
let notifPanelOpen = false;

function toggleNotifPanel() {
  notifPanelOpen = !notifPanelOpen;
  let panel = document.getElementById('notifPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.id = 'notifPanel';
    panel.innerHTML = `
      <div class="notif-panel-header">
        <h3>Notifications</h3>
        <button class="notif-clear-btn" onclick="markAllRead()">Mark all read</button>
      </div>
      <div id="notifList"><div class="notif-empty">No notifications yet</div></div>
    `;
    document.body.appendChild(panel);
    loadNotifications();
  }
  panel.classList.toggle('open', notifPanelOpen);
}

async function loadNotifications() {
  if (!SkillSwapAPI.isLoggedIn()) return;
  try {
    const data = await SkillSwapAPI.get('/notifications');
    const list = document.getElementById('notifList');
    const badge = document.getElementById('notifBadge');

    if (badge && data.unread > 0) { badge.textContent = data.unread; badge.classList.add('show'); }
    else if (badge) { badge.classList.remove('show'); }

    if (data.notifications.length === 0) { list.innerHTML = '<div class="notif-empty">No notifications yet</div>'; return; }

    list.innerHTML = data.notifications.map(n => {
      const icons = { new_booking:'📅', new_message:'💬', badge_earned:'🏆', session_completed:'✅' };
      const payload = n.payload_json ? JSON.parse(n.payload_json) : {};
      return `
        <div class="notif-item${n.read ? '' : ' unread'}" onclick="SkillSwapAPI.patch('/notifications/${n.id}/read')">
          <span class="notif-icon">${icons[n.type] || '🔔'}</span>
          <div class="notif-content">
            <div class="notif-text">${n.type.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
            <div class="notif-time">${timeAgo(n.created_at)}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch { }
}

async function markAllRead() {
  try { await SkillSwapAPI.patch('/notifications/read-all'); loadNotifications(); showToast('All notifications marked read', 'success'); }
  catch { }
}

window.toggleNotifPanel = toggleNotifPanel;
window.markAllRead = markAllRead;
