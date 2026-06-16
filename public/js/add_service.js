/* ============================================
   Add Service Logic
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  if (!requireRole('owner')) return;
  renderDashboardNavbar('owner');
  populateCategories();
  setupForm();
});

function populateCategories() {
  const select = document.getElementById('service-category');
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.value;
    opt.textContent = `${cat.icon} ${cat.label}`;
    select.appendChild(opt);
  });
}

function setupForm() {
  const form = document.getElementById('add-service-form');
  const user = getUser();

  // Pre-fill location from user profile
  if (user && user.location) {
    document.getElementById('service-location').value = user.location;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const serviceName = document.getElementById('service-name').value.trim();
    const category = document.getElementById('service-category').value;
    const description = document.getElementById('service-description').value.trim();
    const cost = document.getElementById('service-cost').value;
    const location = document.getElementById('service-location').value.trim();

    // Validation
    if (!serviceName || !category || !description || !cost || !location) {
      showToast('Please fill in all fields', 'warning');
      return;
    }
    if (Number(cost) <= 0) {
      showToast('Cost must be greater than 0', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-outlined">hourglass_empty</span> Posting…';

    const data = await apiRequest('/api/services', {
      method: 'POST',
      body: JSON.stringify({ serviceName, category, description, cost: Number(cost), location }),
    });

    if (data) {
      showToast('Service posted successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/view_services.html';
      }, 800);
    } else {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">add_circle</span> Post Service';
    }
  });
}
