/* ============================================
   LocalServ — Shared Utilities (app.js)
   ============================================ */

// ── Category Data ──────────────────────────
const CATEGORIES = [
  { value: 'plumbing',    icon: '🔧', label: 'Plumbing' },
  { value: 'electrical',  icon: '⚡', label: 'Electrical' },
  { value: 'cleaning',    icon: '🧹', label: 'Cleaning' },
  { value: 'carpentry',   icon: '🔨', label: 'Carpentry' },
  { value: 'painting',    icon: '🎨', label: 'Painting' },
  { value: 'home-repair', icon: '🏠', label: 'Home Repair' },
  { value: 'gardening',   icon: '🌿', label: 'Gardening' },
  { value: 'moving',      icon: '📦', label: 'Moving' },
  { value: 'security',    icon: '🔒', label: 'Security' },
  { value: 'other',       icon: '🛠️', label: 'Other' },
];

function getCategoryIcon(category) {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat ? cat.icon : '🛠️';
}

function getCategoryLabel(category) {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat ? cat.label : 'Other';
}

// ── Auth Helpers ───────────────────────────
function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

function isLoggedIn() {
  return !!getToken() && !!getUser();
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function requireRole(role) {
  const user = getUser();
  if (!user || user.role !== role) {
    const dest = user && user.role === 'owner'
      ? '/owner_dashboard.html'
      : user && user.role === 'worker'
        ? '/worker_dashboard.html'
        : '/login.html';
    window.location.href = dest;
    return false;
  }
  return true;
}

// ── Fetch Wrapper ──────────────────────────
async function apiRequest(url, options = {}) {
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };
  // Ensure headers from both sources are merged
  if (options.headers) {
    config.headers = { ...config.headers, ...options.headers };
  }
  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!data.success) {
      showToast(data.message || 'Something went wrong', 'error');
      if (res.status === 401) logout();
      return null;
    }
    return data;
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
    return null;
  }
}

// ── Toast System ───────────────────────────
function getOrCreateToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

const TOAST_ICONS = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

function showToast(message, type = 'info') {
  const container = getOrCreateToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-icons-outlined toast-icon">${TOAST_ICONS[type] || 'info'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.classList.add('removing');setTimeout(()=>this.parentElement.remove(),300)">
      <span class="material-icons-outlined">close</span>
    </button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// ── Format Helpers ─────────────────────────
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount) {
  if (amount == null) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// ── Loading States ─────────────────────────
function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p style="color:var(--text-secondary);font-size:0.9rem;">Loading…</p>
    </div>
  `;
}

function hideLoading(containerId) {
  // Caller will replace content, this is a no-op safety
}

// ── Render Navbar ──────────────────────────
function renderDashboardNavbar(role) {
  const user = getUser();
  const initial = user && user.name ? user.name.charAt(0).toUpperCase() : '?';
  const name = user ? user.name : '';
  const isOwner = role === 'owner';

  const links = isOwner
    ? `
      <a href="/owner_dashboard.html" id="nav-dashboard">Dashboard</a>
      <a href="/add_service.html" id="nav-add">Add Service</a>
      <a href="/view_services.html" id="nav-services">My Services</a>
      <a href="/chat.html" id="nav-chat">Chat</a>
      <a href="/profile.html" id="nav-profile">Profile</a>
    `
    : `
      <a href="/worker_dashboard.html" id="nav-dashboard">Dashboard</a>
      <a href="/chat.html" id="nav-chat">Chat</a>
      <a href="/profile.html" id="nav-profile">Profile</a>
    `;

  const nav = document.getElementById('main-navbar');
  if (!nav) return;
  nav.innerHTML = `
    <div class="container">
      <a href="/" class="navbar-brand">
        <span class="brand-icon">🏠</span>
        LocalServ
      </a>
      <div class="navbar-links" id="nav-links">
        ${links}
      </div>
      <div class="navbar-user">
        <div class="user-avatar">${initial}</div>
        <span class="user-greeting">Hi, ${name}</span>
        <button class="btn btn-ghost btn-sm" id="btn-logout" onclick="logout()">Logout</button>
      </div>
      <button class="navbar-toggle" id="nav-toggle" onclick="document.getElementById('nav-links').classList.toggle('active')">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;
  // Highlight active link
  const path = window.location.pathname;
  nav.querySelectorAll('.navbar-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
}

// ── Status badge helper ────────────────────
function statusBadge(status) {
  const s = (status || 'pending').toLowerCase();
  return `<span class="badge badge-${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
}
