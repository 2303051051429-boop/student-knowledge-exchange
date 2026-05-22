/* ═══════════════════════════════════════════════════
   API WRAPPER (api.js) — Fetch helper with auth
═══════════════════════════════════════════════════ */

const API_BASE = window.location.origin + '/api';

class SkillSwapAPI {
  static getToken()  { return localStorage.getItem('ss_token'); }
  static setToken(t) { localStorage.setItem('ss_token', t); }
  static removeToken() { localStorage.removeItem('ss_token'); }
  static getUser()   { const u = localStorage.getItem('ss_user'); return u ? JSON.parse(u) : null; }
  static setUser(u)  { localStorage.setItem('ss_user', JSON.stringify(u)); }
  static removeUser() { localStorage.removeItem('ss_user'); }
  static isLoggedIn() { return !!this.getToken(); }

  static async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { this.removeToken(); this.removeUser(); }
        throw { status: res.status, ...data };
      }
      return data;
    } catch (err) {
      if (err.status) throw err;
      console.error('API Error:', err);
      throw { error: 'Network error. Is the server running?' };
    }
  }

  static get(path)       { return this.request(path); }
  static post(path, body){ return this.request(path, { method: 'POST', body: JSON.stringify(body) }); }
  static put(path, body) { return this.request(path, { method: 'PUT',  body: JSON.stringify(body) }); }
  static patch(path, body){ return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); }

  // File upload (avatar)
  static async upload(path, formData) {
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
    return res.json();
  }

  // Auth shortcuts
  static async login(email, password) {
    const data = await this.post('/auth/login', { email, password });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  static async register(payload) {
    const data = await this.post('/auth/register', payload);
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  static async me() {
    const data = await this.get('/auth/me');
    this.setUser(data.user);
    return data;
  }

  static logout() {
    this.removeToken();
    this.removeUser();
    window.location.href = '/';
  }
}

// Toast notification system
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'toastOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// Update nav based on auth state
function updateNavAuth() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  const user = SkillSwapAPI.getUser();

  // Remove existing auth items
  navLinks.querySelectorAll('.nav-auth-item').forEach(el => el.remove());

  if (user) {
    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    navLinks.innerHTML += `
      <li class="nav-auth-item"><a href="/messages.html">💬 Chat</a></li>
      <li class="nav-auth-item"><a href="/dashboard.html">Dashboard</a></li>
      <li class="nav-auth-item">
        <button class="notif-btn" onclick="toggleNotifPanel()" title="Notifications">🔔<span class="notif-badge" id="notifBadge">0</span></button>
      </li>
      <li class="nav-auth-item">
        <a href="/dashboard.html" class="nav-user-btn">
          <div class="nav-avatar">${user.avatar ? `<img src="${user.avatar}">` : initials}</div>
        </a>
      </li>
      <li class="nav-auth-item"><a href="#" onclick="SkillSwapAPI.logout();return false;" style="color:rgba(255,255,255,0.35);">Logout</a></li>
    `;
  } else {
    const ctaExists = navLinks.querySelector('.nav-cta');
    if (!ctaExists) {
      navLinks.innerHTML += `<li class="nav-auth-item"><a href="#" class="nav-cta" onclick="openAuthModal();return false;">Get Started Free</a></li>`;
    }
  }
}

// Time ago formatter
function timeAgo(dateStr) {
  const now = Date.now();
  const d   = new Date(dateStr).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

window.SkillSwapAPI = SkillSwapAPI;
window.showToast    = showToast;
window.updateNavAuth= updateNavAuth;
window.timeAgo      = timeAgo;
