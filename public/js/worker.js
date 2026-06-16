/* ============================================
   Worker Dashboard Logic
   ============================================ */
let allServices = [];
let allProposals = [];
let activeCategory = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  if (!requireRole('worker')) return;
  renderDashboardNavbar('worker');
  populateCategoryUI();
  loadDashboard();

  // Enter key on search inputs
  document.getElementById('search-input').addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); });
  document.getElementById('location-input').addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); });
});

function populateCategoryUI() {
  // Dropdown
  const select = document.getElementById('category-select');
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.value;
    opt.textContent = `${cat.icon} ${cat.label}`;
    select.appendChild(opt);
  });

  // Chips
  const chips = document.getElementById('category-chips');
  chips.innerHTML = `<button class="chip active" data-cat="" onclick="selectChip(this)">All</button>` +
    CATEGORIES.map(c => `<button class="chip" data-cat="${c.value}" onclick="selectChip(this)">${c.icon} ${c.label}</button>`).join('');
}

function selectChip(el) {
  document.querySelectorAll('#category-chips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeCategory = el.dataset.cat;
  document.getElementById('category-select').value = activeCategory;
  applyFilters();
}

async function loadDashboard() {
  const user = getUser();
  const header = document.getElementById('dashboard-header');
  if (user && header) {
    header.querySelector('p').textContent = `Welcome, ${user.name}! Browse services and send proposals.`;
  }

  // Load stats
  const statsData = await apiRequest('/api/stats');
  if (statsData && statsData.stats) {
    const s = statsData.stats;
    document.getElementById('stat-total').textContent = s.totalProposals ?? 0;
    document.getElementById('stat-accepted').textContent = s.accepted ?? 0;
    document.getElementById('stat-pending').textContent = s.pending ?? 0;
    document.getElementById('stat-rate').textContent = s.successRate != null ? s.successRate + '%' : '—';
  }

  // Load services and proposals
  const [servicesData, proposalsData] = await Promise.all([
    apiRequest('/api/services'),
    apiRequest('/api/proposals'),
  ]);

  allServices = servicesData ? servicesData.services : [];
  allProposals = proposalsData ? proposalsData.proposals : [];
  renderServices(allServices);
}

// Category keyword mapping for smart matching
const CATEGORY_KEYWORDS = {
  plumbing:     ['plumber', 'plumbing', 'pipe', 'tap', 'faucet', 'drain', 'leak', 'water'],
  electrical:   ['electrician', 'electrical', 'wiring', 'fan', 'switch', 'light', 'socket', 'wire'],
  cleaning:     ['cleaning', 'cleaner', 'clean', 'wash', 'mop', 'sweep', 'floor', 'washroom'],
  carpentry:    ['carpenter', 'carpentry', 'wood', 'furniture', 'door', 'cabinet'],
  painting:     ['painter', 'painting', 'paint', 'wall', 'color', 'colour'],
  'home-repair':['repair', 'fix', 'maintenance', 'handyman', 'home repair'],
  gardening:    ['garden', 'gardener', 'lawn', 'plant', 'tree', 'landscap'],
  moving:       ['mover', 'moving', 'shifting', 'transport', 'packer', 'relocation'],
  security:     ['security', 'guard', 'watchman', 'cctv', 'gate', 'surveillance'],
  other:        [],
};

function serviceMatchesCategory(s, category) {
  if (s.category === category) return true;
  const keywords = CATEGORY_KEYWORDS[category] || [];
  const name = (s.serviceName || '').toLowerCase();
  const desc = (s.description || '').toLowerCase();
  return keywords.some(kw => name.includes(kw) || desc.includes(kw));
}

function applyFilters() {
  const search = document.getElementById('search-input').value.trim().toLowerCase();
  const location = document.getElementById('location-input').value.trim().toLowerCase();
  const category = activeCategory || document.getElementById('category-select').value;

  let filtered = allServices;

  if (search) {
    filtered = filtered.filter(s => {
      const name = (s.serviceName || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      // Direct text match
      if (name.includes(search) || desc.includes(search) || cat.includes(search)) return true;
      // Keyword match: e.g. "plumber" should match services with category "plumbing"
      return Object.entries(CATEGORY_KEYWORDS).some(
        ([catKey, keywords]) => keywords.some(kw => kw.includes(search) || search.includes(kw)) && serviceMatchesCategory(s, catKey)
      );
    });
  }

  if (location) filtered = filtered.filter(s => s.location && s.location.toLowerCase().includes(location));

  if (category) filtered = filtered.filter(s => serviceMatchesCategory(s, category));

  renderServices(filtered);
}

function renderServices(services) {
  const container = document.getElementById('services-container');
  const countBadge = document.getElementById('results-count');
  countBadge.textContent = `${services.length} service${services.length !== 1 ? 's' : ''} found`;

  if (services.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">🔍</div>
        <h3>No services found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }

  const user = getUser();
  container.innerHTML = services.map(s => {
    const proposal = allProposals.find(p => p.serviceId === s.serviceId);
    const catIcon = getCategoryIcon(s.category);
    const catLabel = getCategoryLabel(s.category);

    return `
      <div class="service-card" id="service-${s.serviceId}" style="animation:fadeIn 0.5s ease-out both;">
        <div class="service-card-body">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <span class="badge badge-category">${catIcon} ${catLabel}</span>
          </div>
          <h3 style="margin-bottom:8px;">${s.serviceName}</h3>
          <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            ${s.description || 'No description provided'}
          </p>
          <div style="margin-top:auto;">
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary);margin-bottom:8px;">
              ${formatCurrency(s.cost)}
            </div>
            <div style="display:flex;align-items:center;gap:6px;color:var(--text-secondary);font-size:0.85rem;">
              <span class="material-icons-outlined" style="font-size:1rem;">location_on</span>
              ${s.location || '—'}
            </div>
            ${s.ownerName ? `<div style="display:flex;align-items:center;gap:6px;color:var(--text-light);font-size:0.8rem;margin-top:4px;">
              <span class="material-icons-outlined" style="font-size:1rem;">person</span>
              ${s.ownerName}
            </div>` : ''}
          </div>
        </div>
        <div class="service-card-footer">
          ${proposal ? `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <span style="font-size:0.9rem;color:var(--text-secondary);">Your bid: <strong style="color:var(--primary);">${formatCurrency(proposal.proposedCost)}</strong></span>
              ${statusBadge(proposal.status)}
            </div>
            <div class="contact-actions">
              <a href="/chat.html?phone=${s.ownerPhone}&name=${encodeURIComponent(s.ownerName || s.ownerPhone)}" class="btn btn-chat">
                <span class="material-icons-outlined" style="font-size:1rem;">chat</span> Chat Owner
              </a>
              <a href="tel:+91${s.ownerPhone}" class="btn btn-call">
                <span class="material-icons-outlined" style="font-size:1rem;">call</span> Call
              </a>
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;">
              <button class="btn btn-success btn-sm btn-block" id="accept-cost-${s.serviceId}" onclick="acceptOwnerCost(${s.serviceId})">
                Accept Owner Cost
              </button>
              <div class="bid-section">
                <input type="number" class="form-input" id="bid-${s.serviceId}" placeholder="₹ Your price" min="1" />
                <button class="btn btn-primary btn-sm" id="send-bid-${s.serviceId}" onclick="sendProposal(${s.serviceId})">Send</button>
              </div>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

async function sendProposal(serviceId) {
  const input = document.getElementById(`bid-${serviceId}`);
  const proposedCost = input.value;
  if (!proposedCost || proposedCost <= 0) {
    showToast('Please enter a valid cost', 'warning');
    return;
  }

  const data = await apiRequest('/api/proposals', {
    method: 'POST',
    body: JSON.stringify({ serviceId, proposedCost: Number(proposedCost) }),
  });

  if (data) {
    showToast('Proposal sent successfully!', 'success');
    loadDashboard();
  }
}

async function acceptOwnerCost(serviceId) {
  const service = allServices.find(s => s.serviceId === serviceId);
  if (!service) return;

  const data = await apiRequest('/api/proposals', {
    method: 'POST',
    body: JSON.stringify({ serviceId, proposedCost: Number(service.cost) }),
  });

  if (data) {
    showToast('Proposal sent at owner cost!', 'success');
    loadDashboard();
  }
}
