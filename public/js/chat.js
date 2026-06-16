/* ============================================
   Chat Page Logic — Socket.IO Real-time
   ============================================ */
let socket = null;
let currentChatPhone = null;
let allConversations = [];
let typingTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  const user = getUser();
  renderDashboardNavbar(user.role);
  initSocket();
  loadConversations();

  // Enter key sends message
  document.getElementById('message-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Typing indicator
  document.getElementById('message-input').addEventListener('input', () => {
    if (currentChatPhone && socket) {
      socket.emit('typing', { to: currentChatPhone });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { to: currentChatPhone });
      }, 1500);
    }
  });

  // Conversation search
  document.getElementById('conv-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.conv-item');
    items.forEach(item => {
      const name = item.dataset.name?.toLowerCase() || '';
      item.style.display = name.includes(q) ? '' : 'none';
    });
  });

  // Check if we need to open a specific chat from URL params
  const params = new URLSearchParams(window.location.search);
  const chatWith = params.get('phone');
  const chatName = params.get('name');
  if (chatWith) {
    setTimeout(() => openChat(chatWith, chatName || chatWith), 500);
  }
});

// ── Socket.IO Connection ──
function initSocket() {
  const token = getToken();
  socket = io({ auth: { token } });

  socket.on('connect', () => {
    console.log('🟢 Connected to chat');
  });

  socket.on('new_message', (msg) => {
    const user = getUser();
    // If this message is for the currently open chat, add it
    if (msg.from === currentChatPhone) {
      appendMessage(msg, false);
      scrollToBottom();
      socket.emit('mark_read', { from: msg.from });
    }
    // Refresh conversation list
    loadConversations();
  });

  socket.on('message_sent', (msg) => {
    appendMessage(msg, true);
    scrollToBottom();
  });

  socket.on('user_typing', (data) => {
    if (data.from === currentChatPhone) {
      const indicator = document.getElementById('typing-indicator');
      indicator.style.display = 'flex';
    }
  });

  socket.on('user_stop_typing', (data) => {
    if (data.from === currentChatPhone) {
      document.getElementById('typing-indicator').style.display = 'none';
    }
  });

  socket.on('messages_read', () => {
    // Mark sent messages as read visually
    document.querySelectorAll('.msg-status.sent').forEach(el => {
      el.textContent = '✓✓';
      el.classList.add('read');
    });
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });
}

// ── Load Conversations ──
async function loadConversations() {
  const data = await apiRequest('/api/messages/conversations');
  allConversations = data ? data.conversations : [];
  renderConversations(allConversations);
}

function renderConversations(conversations) {
  const container = document.getElementById('conversation-list');
  const unreadBadge = document.getElementById('total-unread');

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  if (totalUnread > 0) {
    unreadBadge.textContent = totalUnread;
    unreadBadge.style.display = 'inline-block';
  } else {
    unreadBadge.style.display = 'none';
  }

  if (conversations.length === 0) {
    container.innerHTML = `
      <div class="conv-empty">
        <p>No conversations yet</p>
        <small>Start chatting from a service page</small>
      </div>
    `;
    return;
  }

  container.innerHTML = conversations.map(c => `
    <div class="conv-item ${c.phone === currentChatPhone ? 'active' : ''} ${c.unread > 0 ? 'unread' : ''}"
         data-phone="${c.phone}" data-name="${c.name}"
         onclick="openChat('${c.phone}', '${c.name.replace(/'/g, "\\'")}')">
      <div class="conv-avatar">${(c.name || '?').charAt(0).toUpperCase()}</div>
      <div class="conv-info">
        <div class="conv-top">
          <span class="conv-name">${c.name}</span>
          <span class="conv-time">${formatChatTime(c.lastTimestamp)}</span>
        </div>
        <div class="conv-bottom">
          <span class="conv-last-msg">${truncate(c.lastMessage, 40)}</span>
          ${c.unread > 0 ? `<span class="conv-unread-badge">${c.unread}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ── Open Chat ──
async function openChat(phone, name) {
  currentChatPhone = phone;

  // Mobile: hide sidebar, show chat
  document.getElementById('chat-sidebar').classList.add('hidden-mobile');
  document.getElementById('chat-main').classList.add('active-mobile');

  // Show chat panel
  document.getElementById('chat-empty').style.display = 'none';
  document.getElementById('chat-active').style.display = 'flex';

  // Set header
  document.getElementById('chat-avatar').textContent = (name || '?').charAt(0).toUpperCase();
  document.getElementById('chat-user-name').textContent = name || phone;
  document.getElementById('chat-call-btn').href = `tel:+91${phone}`;
  document.getElementById('chat-status').textContent = '';

  // Mark conversation as active
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
  const activeConv = document.querySelector(`.conv-item[data-phone="${phone}"]`);
  if (activeConv) activeConv.classList.add('active');

  // Load messages
  const messagesDiv = document.getElementById('chat-messages');
  messagesDiv.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  const data = await apiRequest(`/api/messages/${phone}`);
  if (data) {
    if (data.otherUser) {
      document.getElementById('chat-user-name').textContent = data.otherUser.name;
      document.getElementById('chat-avatar').textContent = (data.otherUser.name || '?').charAt(0).toUpperCase();
      document.getElementById('chat-status').textContent = data.otherUser.role === 'owner' ? '🏠 Service Owner' : '💼 Service Worker';
    }
    renderMessages(data.messages);
    // Mark as read
    socket.emit('mark_read', { from: phone });
    loadConversations();
  }

  document.getElementById('message-input').focus();
}

function renderMessages(messages) {
  const container = document.getElementById('chat-messages');
  const user = getUser();

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="chat-start-msg">
        <p>👋 Start the conversation!</p>
      </div>
    `;
    return;
  }

  // Group by date
  let lastDate = '';
  let html = '';

  messages.forEach(msg => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (msgDate !== lastDate) {
      html += `<div class="chat-date-divider"><span>${msgDate}</span></div>`;
      lastDate = msgDate;
    }

    const isMine = msg.from === user.phone;
    html += `
      <div class="msg ${isMine ? 'msg-sent' : 'msg-received'}">
        <div class="msg-bubble">
          <p>${escapeHtml(msg.message)}</p>
          <span class="msg-time">
            ${formatChatTime(msg.timestamp)}
            ${isMine ? `<span class="msg-status ${msg.read ? 'read' : 'sent'}">${msg.read ? '✓✓' : '✓'}</span>` : ''}
          </span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  scrollToBottom();
}

function appendMessage(msg, isMine) {
  const container = document.getElementById('chat-messages');
  const startMsg = container.querySelector('.chat-start-msg');
  if (startMsg) startMsg.remove();

  const div = document.createElement('div');
  div.className = `msg ${isMine ? 'msg-sent' : 'msg-received'} msg-new`;
  div.innerHTML = `
    <div class="msg-bubble">
      <p>${escapeHtml(msg.message)}</p>
      <span class="msg-time">
        ${formatChatTime(msg.timestamp)}
        ${isMine ? `<span class="msg-status sent">✓</span>` : ''}
      </span>
    </div>
  `;
  container.appendChild(div);

  // Hide typing indicator
  document.getElementById('typing-indicator').style.display = 'none';
}

// ── Send Message ──
function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  if (!message || !currentChatPhone) return;

  socket.emit('send_message', { to: currentChatPhone, message });
  socket.emit('stop_typing', { to: currentChatPhone });
  input.value = '';
  input.focus();
}

// ── Mobile: Back to sidebar ──
function showSidebar() {
  document.getElementById('chat-sidebar').classList.remove('hidden-mobile');
  document.getElementById('chat-main').classList.remove('active-mobile');
}

// ── Helpers ──
function scrollToBottom() {
  const el = document.getElementById('chat-messages');
  el.scrollTop = el.scrollHeight;
}

function formatChatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;

  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '…' : str;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
