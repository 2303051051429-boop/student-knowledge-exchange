/* ═══════════════════════════════════════════════════
   CHAT JS (chat.js) — Messages with REST fallback
   Socket.io only used when available (local dev).
   On Vercel serverless, falls back to REST polling.
═══════════════════════════════════════════════════ */

let socket = null;
let currentUser = null;
let currentPartnerId = null;
let conversations = [];
let pollTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!SkillSwapAPI.isLoggedIn()) { window.location.href = '/'; return; }

  try {
    const data = await SkillSwapAPI.me();
    currentUser = data.user;

    // Try Socket.io — only works locally, not on Vercel serverless
    try {
      if (typeof io !== 'undefined') {
        socket = io(window.location.origin, {
          auth: { token: SkillSwapAPI.getToken() },
          reconnectionAttempts: 3,
          timeout: 3000
        });
        setupSocketListeners();
      }
    } catch (e) {
      console.warn('Socket.io not available, using REST polling');
      socket = null;
    }

    await loadConversations();

    // If no socket, poll for new messages every 5 seconds
    if (!socket) {
      pollTimer = setInterval(async () => {
        await loadConversations();
        if (currentPartnerId) {
          try {
            const d = await SkillSwapAPI.get(`/messages/${currentPartnerId}`);
            renderMessages(d.messages);
          } catch (e) {}
        }
      }, 5000);
    }

    // Setup input listeners
    const input = document.getElementById('chatInput');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });

      input.addEventListener('input', () => {
        if (!currentPartnerId || !socket) return;
        socket.emit('typing', { receiverId: currentPartnerId });
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
          socket.emit('stop_typing', { receiverId: currentPartnerId });
        }, 1000);
      });
    }

  } catch (err) {
    console.error('Chat init error:', err);
    // Show error instead of redirecting
    const list = document.getElementById('chatList');
    if (list) list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--ink-faint);font-style:italic;">Could not load messages</div>`;
  }
});

function setupSocketListeners() {
  if (!socket) return;

  socket.on('connect', () => { console.log('Socket connected'); });
  socket.on('connect_error', () => { console.warn('Socket connection failed — using REST'); socket = null; });

  socket.on('message_received', (msg) => {
    if (msg.sender_id === currentPartnerId || msg.receiver_id === currentPartnerId) {
      appendMessage(msg);
      markMessagesAsRead(currentPartnerId);
    }
    loadConversations();
  });

  socket.on('user_online', (data) => {
    const userId = typeof data === 'string' ? data : data.userId;
    if (userId === currentPartnerId) {
      const statusEl = document.getElementById('partnerStatus');
      statusEl.textContent = 'Online';
      statusEl.classList.add('online');
    }
  });

  socket.on('user_offline', (data) => {
    const userId = typeof data === 'string' ? data : data.userId;
    if (userId === currentPartnerId) {
      const statusEl = document.getElementById('partnerStatus');
      statusEl.textContent = 'Offline';
      statusEl.classList.remove('online');
    }
  });

  socket.on('user_typing', (data) => {
    if (data.senderId === currentPartnerId) showTypingIndicator();
  });

  socket.on('user_stop_typing', (data) => {
    if (data.senderId === currentPartnerId) removeTypingIndicator();
  });
}

async function loadConversations() {
  try {
    const data = await SkillSwapAPI.get('/messages');
    conversations = data.conversations || [];
    renderConversations();
  } catch (err) {
    console.error('Load conversations error:', err);
    const list = document.getElementById('chatList');
    if (list && conversations.length === 0) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--ink-faint);font-style:italic;">No messages yet. Book a session to start chatting!</div>`;
    }
  }
}

function renderConversations(filter = '') {
  const list = document.getElementById('chatList');
  if (!list) return;

  if (conversations.length === 0) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--ink-faint);font-style:italic;">No messages yet. Book a session to start chatting!</div>`;
    return;
  }

  let html = '';
  conversations.forEach(c => {
    // API returns partner_name, partner_id, partner_avatar — map to what the template uses
    const name = c.partner_name || c.name || 'Unknown';
    const id = c.partner_id || c.id;
    const avatar = c.partner_avatar || c.avatar || '';
    const isOnline = c.is_online || false;

    if (filter && !name.toLowerCase().includes(filter.toLowerCase())) return;

    const onlineHtml = isOnline ? `<div class="online-indicator"></div>` : '';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatarHtml = avatar ? `<img src="${avatar}">` : initials;
    const unread = c.unread_count > 0 ? `<div class="chat-unread-badge">${c.unread_count}</div>` : '';
    const activeCls = id === currentPartnerId ? ' active' : '';
    const timeStr = (c.last_at || c.last_message_time) ? timeAgo(c.last_at || c.last_message_time) : '';

    html += `
      <div class="chat-item${activeCls}" onclick="openChat('${id}', '${name.replace(/'/g, "\\'")}', '${avatar}', ${isOnline})">
        <div class="chat-item-avatar">
          ${avatarHtml}
          ${onlineHtml}
        </div>
        <div class="chat-item-info">
          <div class="chat-item-name">${name}</div>
          <div class="chat-item-last">${c.last_message || '...'}</div>
        </div>
        <div class="chat-item-meta">
          <div class="chat-item-time">${timeStr}</div>
          ${unread}
        </div>
      </div>
    `;
  });

  list.innerHTML = html || `<div style="padding:20px;text-align:center;color:var(--ink-faint);font-style:italic;">No matching conversations</div>`;
}

document.getElementById('chatSearch')?.addEventListener('input', (e) => {
  renderConversations(e.target.value);
});

async function openChat(partnerId, name, avatar, isOnline) {
  currentPartnerId = partnerId;

  // Mobile responsive view handling
  if (window.innerWidth <= 768) {
    document.getElementById('chatSidebar').classList.remove('mobile-open');
    const backBtn = document.getElementById('chatBackBtn');
    if (backBtn) backBtn.style.display = 'block';
  }

  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('chatActive').style.display = 'flex';

  document.getElementById('partnerName').textContent = name;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('partnerAvatar').innerHTML = avatar ? `<img src="${avatar}">` : initials;

  const statusEl = document.getElementById('partnerStatus');
  statusEl.textContent = isOnline ? 'Online' : 'Offline';
  statusEl.classList.toggle('online', isOnline);

  document.getElementById('chatMessages').innerHTML = '<div class="skeleton" style="height:100px;margin:20px;"></div>';
  renderConversations(); // Update active state

  try {
    const data = await SkillSwapAPI.get(`/messages/${partnerId}`);
    renderMessages(data.messages);
    markMessagesAsRead(partnerId);
  } catch (err) {
    console.error('Load messages error:', err);
    document.getElementById('chatMessages').innerHTML = `<div style="text-align:center;padding:40px;color:var(--ink-faint);font-style:italic;">Could not load messages</div>`;
  }
}

document.getElementById('chatBackBtn')?.addEventListener('click', () => {
  document.getElementById('chatSidebar').classList.add('mobile-open');
});

function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  if (!messages || messages.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--ink-faint);font-style:italic;">Send a message to start the conversation!</div>`;
    return;
  }

  container.innerHTML = '';
  let lastDate = '';

  // Messages come ASC from API, just iterate
  const sorted = [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  sorted.forEach(m => {
    const dateStr = new Date(m.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    if (dateStr !== lastDate) {
      container.innerHTML += `<div class="chat-date-divider"><span>${dateStr}</span></div>`;
      lastDate = dateStr;
    }
    appendMessage(m, false);
  });

  scrollToBottom();
}

function appendMessage(m, doScroll = true) {
  const container = document.getElementById('chatMessages');
  removeTypingIndicator();

  const isSent = m.sender_id === currentUser.id;
  const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const el = document.createElement('div');
  el.className = `msg-bubble ${isSent ? 'sent' : 'received'}`;
  el.innerHTML = `
    <div>${m.content}</div>
    <div class="msg-time">${time}</div>
  `;
  container.appendChild(el);
  if (doScroll) scrollToBottom();
}

function scrollToBottom() {
  const container = document.getElementById('chatMessages');
  if (container) container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !currentPartnerId) return;

  // Send via socket if available, else via REST
  if (socket && socket.connected) {
    socket.emit('send_message', { receiverId: currentPartnerId, content: text });
  } else {
    // REST fallback
    try {
      await SkillSwapAPI.post('/messages', {
        receiverId: currentPartnerId,
        content: text
      });
    } catch (e) {
      showToast('Failed to send message', 'error');
      return;
    }
  }

  // Optimistic UI update
  const m = {
    sender_id: currentUser.id,
    receiver_id: currentPartnerId,
    content: text,
    created_at: new Date().toISOString()
  };
  appendMessage(m);

  input.value = '';
  if (socket) socket.emit('stop_typing', { receiverId: currentPartnerId });
}

async function markMessagesAsRead(partnerId) {
  try {
    await SkillSwapAPI.patch(`/messages/${partnerId}/read`);
    loadConversations();
  } catch (err) {}
}

function showTypingIndicator() {
  if (document.getElementById('typingInd')) return;
  const container = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'typing-indicator';
  el.id = 'typingInd';
  el.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  container.appendChild(el);
  scrollToBottom();
}

function removeTypingIndicator() {
  const ind = document.getElementById('typingInd');
  if (ind) ind.remove();
}

window.openChat = openChat;
window.sendMessage = sendMessage;
