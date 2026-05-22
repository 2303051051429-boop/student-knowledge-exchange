/* ═══════════════════════════════════════════════════
   CHAT JS (chat.js) — Socket.io integration
═══════════════════════════════════════════════════ */

let socket = null;
let currentUser = null;
let currentPartnerId = null;
let conversations = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!SkillSwapAPI.isLoggedIn()) { window.location.href = '/'; return; }
  
  try {
    const data = await SkillSwapAPI.me();
    currentUser = data.user;
    
    // Connect to Socket.io
    socket = io(window.location.origin, {
      auth: { token: SkillSwapAPI.getToken() }
    });
    
    setupSocketListeners();
    loadConversations();
    
    // Setup input listeners
    const input = document.getElementById('chatInput');
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    
    input.addEventListener('input', () => {
      if (!currentPartnerId) return;
      socket.emit('typing', { receiverId: currentPartnerId });
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { receiverId: currentPartnerId });
      }, 1000);
    });
    
  } catch (err) {
    console.error(err);
    window.location.href = '/';
  }
});

function setupSocketListeners() {
  socket.on('connect', () => { console.log('Socket connected'); });
  
  socket.on('message_received', (msg) => {
    // If msg belongs to current active chat, append it
    if (msg.sender_id === currentPartnerId || msg.receiver_id === currentPartnerId) {
      appendMessage(msg);
      markMessagesAsRead(currentPartnerId);
    }
    // Update conversation list side bar
    loadConversations(); 
  });
  
  socket.on('user_online', (userId) => {
    if (userId === currentPartnerId) {
      const statusEl = document.getElementById('partnerStatus');
      statusEl.textContent = 'Online';
      statusEl.classList.add('online');
    }
  });
  
  socket.on('user_offline', (userId) => {
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
    conversations = data.conversations;
    renderConversations();
  } catch (err) {
    console.error(err);
  }
}

function renderConversations(filter = '') {
  const list = document.getElementById('chatList');
  if (conversations.length === 0) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--ink-faint);font-style:italic;">No messages yet</div>`;
    return;
  }
  
  let html = '';
  conversations.forEach(c => {
    if (filter && !c.name.toLowerCase().includes(filter.toLowerCase())) return;
    
    const isOnline = c.is_online ? `<div class="online-indicator"></div>` : '';
    const initials = c.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const avatarHtml = c.avatar ? `<img src="${c.avatar}">` : initials;
    const unread = c.unread_count > 0 ? `<div class="chat-unread-badge">${c.unread_count}</div>` : '';
    const activeCls = c.id === currentPartnerId ? ' active' : '';
    const timeStr = c.last_message_time ? timeAgo(c.last_message_time) : '';
    
    html += `
      <div class="chat-item${activeCls}" onclick="openChat('${c.id}', '${c.name}', '${c.avatar||''}', ${c.is_online})">
        <div class="chat-item-avatar">
          ${avatarHtml}
          ${isOnline}
        </div>
        <div class="chat-item-info">
          <div class="chat-item-name">${c.name}</div>
          <div class="chat-item-last">${c.last_message || '...'}</div>
        </div>
        <div class="chat-item-meta">
          <div class="chat-item-time">${timeStr}</div>
          ${unread}
        </div>
      </div>
    `;
  });
  
  list.innerHTML = html;
}

document.getElementById('chatSearch')?.addEventListener('input', (e) => {
  renderConversations(e.target.value);
});

async function openChat(partnerId, name, avatar, isOnline) {
  currentPartnerId = partnerId;
  
  // Mobile responsive view handling
  if (window.innerWidth <= 768) {
    document.getElementById('chatSidebar').classList.remove('mobile-open');
    document.getElementById('chatBackBtn').style.display = 'block';
  }
  
  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('chatActive').style.display = 'flex';
  
  document.getElementById('partnerName').textContent = name;
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
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
    console.error(err);
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
  
  messages.reverse().forEach(m => {
    const dateStr = new Date(m.created_at).toLocaleDateString('en-IN', { month:'short', day:'numeric', year:'numeric' });
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
  removeTypingIndicator(); // Ensure it's removed if they sent a msg
  
  const isSent = m.sender_id === currentUser.id;
  const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  
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
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !currentPartnerId) return;
  
  socket.emit('send_message', { receiverId: currentPartnerId, content: text });
  
  // Optimistic UI update
  const m = {
    sender_id: currentUser.id,
    receiver_id: currentPartnerId,
    content: text,
    created_at: new Date().toISOString()
  };
  appendMessage(m);
  
  input.value = '';
  socket.emit('stop_typing', { receiverId: currentPartnerId });
}

async function markMessagesAsRead(partnerId) {
  try {
    await SkillSwapAPI.patch(`/messages/${partnerId}/read`);
    loadConversations(); // refresh unread badges
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
