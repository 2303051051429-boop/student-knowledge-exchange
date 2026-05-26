/* ═══════════════════════════════════════════════════
   AUTH MODAL (auth.js) — Login / Signup
═══════════════════════════════════════════════════ */

function createAuthModal() {
  if (document.getElementById('authModal')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'authModal';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" onclick="closeAuthModal()">✕</button>
      <div class="modal-header">
        <h2>Welcome to Skill<span style="color:var(--ink-faint);font-weight:400;">Swap</span></h2>
        <p>Start your learning journey today</p>
      </div>
      <div class="modal-body">
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login" onclick="switchAuthTab('login')">Log In</button>
          <button class="auth-tab" data-tab="signup" onclick="switchAuthTab('signup')">Sign Up</button>
        </div>

        <!-- Login Form -->
        <form id="loginForm" class="auth-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="loginEmail" placeholder="you@university.ac.in" required>
            <div class="form-error" id="loginEmailErr"></div>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="loginPassword" placeholder="••••••••" required>
            <div class="form-error" id="loginPasswordErr"></div>
          </div>
          <div class="form-error" id="loginGlobalErr" style="margin-bottom:12px"></div>
          <button type="submit" class="btn-primary" style="width:100%;text-align:center;">Log In →</button>
        </form>

        <!-- Signup Form -->
        <form id="signupForm" class="auth-form" style="display:none" onsubmit="handleSignup(event)">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="signupName" placeholder="Aryan Mehta" required>
            <div class="form-error" id="signupNameErr"></div>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="signupEmail" placeholder="you@university.ac.in" required>
            <div class="form-error" id="signupEmailErr"></div>
          </div>
          <div class="form-group">
            <label>University</label>
            <input type="text" id="signupUni" placeholder="IIT Bombay">
          </div>
          <div class="form-group">
            <label>Password (min. 6 chars)</label>
            <input type="password" id="signupPassword" placeholder="••••••••" required minlength="6">
            <div class="form-error" id="signupPasswordErr"></div>
          </div>
          <div class="form-error" id="signupGlobalErr" style="margin-bottom:12px"></div>
          <button type="submit" class="btn-primary" style="width:100%;text-align:center;">Create Account →</button>
        </form>

        <!-- Social buttons removed until OAuth is implemented -->

        <p style="text-align:center;margin-top:20px;font-size:12px;color:var(--ink-faint);font-style:italic;">
          Demo: demo@skillswap.com / password123
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function openAuthModal() {
  createAuthModal();
  setTimeout(() => document.getElementById('authModal').classList.add('active'), 10);
}

function closeAuthModal() {
  const m = document.getElementById('authModal');
  if (m) { m.classList.remove('active'); setTimeout(() => m.remove(), 300); }
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('loginForm').style.display  = tab === 'login' ? 'block' : 'none';
  document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  clearErrors();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    await SkillSwapAPI.login(email, password);
    closeAuthModal();
    updateNavAuth();
    showToast('Welcome back! 🎉', 'success');
    // Reload if on dashboard or chat
    if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('messages')) {
      window.location.reload();
    }
  } catch (err) {
    showFormError('loginGlobalErr', err.error || 'Login failed');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  clearErrors();
  const name       = document.getElementById('signupName').value.trim();
  const email      = document.getElementById('signupEmail').value.trim();
  const university = document.getElementById('signupUni').value.trim();
  const password   = document.getElementById('signupPassword').value;

  if (name.length < 2) return showFormError('signupNameErr', 'Name too short');
  if (password.length < 6) return showFormError('signupPasswordErr', 'Min 6 characters');

  try {
    await SkillSwapAPI.register({ name, email, university, password });
    closeAuthModal();
    updateNavAuth();
    showToast('Account created! Welcome to SkillSwap 🚀', 'success');
  } catch (err) {
    if (err.errors) err.errors.forEach(e => showToast(e.msg, 'error'));
    else showFormError('signupGlobalErr', err.error || 'Signup failed');
  }
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => { el.classList.remove('show'); el.textContent = ''; });
}

window.openAuthModal  = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab  = switchAuthTab;
window.handleLogin    = handleLogin;
window.handleSignup   = handleSignup;
