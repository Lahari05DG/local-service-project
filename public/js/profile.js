/* ============================================
   Profile Page Logic
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  const user = getUser();
  renderDashboardNavbar(user.role);
  loadProfile();
  setupForm();
});

function loadProfile() {
  const user = getUser();
  if (!user) return;

  // Avatar
  const avatar = document.getElementById('profile-avatar');
  avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : '?';

  // Header
  document.getElementById('profile-name').textContent = user.name || '—';

  const roleBadge = document.getElementById('profile-role-badge');
  roleBadge.textContent = user.role === 'owner' ? 'Service Owner' : 'Service Worker';
  roleBadge.className = `badge ${user.role === 'owner' ? 'badge-owner' : 'badge-worker'}`;

  document.getElementById('profile-phone').textContent = `📱 ${user.phone}`;

  // Form fields
  document.getElementById('profile-name-input').value = user.name || '';
  document.getElementById('profile-location-input').value = user.location || '';
  document.getElementById('profile-phone-input').value = user.phone || '';
  document.getElementById('profile-role-input').value = user.role === 'owner' ? 'Service Owner' : 'Service Worker';
}

function setupForm() {
  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('update-btn');
    const name = document.getElementById('profile-name-input').value.trim();
    const location = document.getElementById('profile-location-input').value.trim();

    if (!name || !location) {
      showToast('Name and location are required', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-outlined">hourglass_empty</span> Updating…';

    const data = await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, location }),
    });

    if (data) {
      // Update localStorage with new user data
      const token = getToken();
      saveAuth(token, data.user);
      showToast('Profile updated successfully!', 'success');
      loadProfile();
      // Re-render navbar to reflect new name
      const user = getUser();
      renderDashboardNavbar(user.role);
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-outlined">save</span> Update Profile';
  });
}
