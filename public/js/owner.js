/* ============================================
   Owner Dashboard Logic
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  if (!requireRole('owner')) return;
  renderDashboardNavbar('owner');
  loadDashboard();
});

async function loadDashboard() {
  const user = getUser();
  const header = document.getElementById('dashboard-header');
  if (user && header) {
    header.querySelector('h1').textContent = `Dashboard`;
    header.querySelector('p').textContent = `Welcome back, ${user.name}! Here's an overview of your services.`;
  }

  // Load stats
  const statsData = await apiRequest('/api/stats');
  if (statsData && statsData.stats) {
    const s = statsData.stats;
    document.getElementById('stat-total').textContent = s.totalServices ?? 0;
    document.getElementById('stat-proposals').textContent = s.totalProposals ?? 0;
    document.getElementById('stat-accepted').textContent = s.accepted ?? 0;
    document.getElementById('stat-pending').textContent = s.pending ?? 0;
  }

  // Load proposals
  const proposalsData = await apiRequest('/api/proposals');
  renderProposals(proposalsData ? proposalsData.proposals : []);
}

function renderProposals(proposals) {
  const container = document.getElementById('proposals-container');
  if (!proposals || proposals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💼</div>
        <h3>No proposals yet</h3>
        <p>When workers send proposals on your services, they'll appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = proposals.map(p => `
    <div class="proposal-card" id="proposal-${p._id || p.serviceId}">
      <div class="proposal-info">
        <h4>${p.serviceName || p.serviceId || 'Service'}</h4>
        <span>📱 Worker: ${p.workerName || p.workerPhone || '—'}</span>
      </div>
      <div class="proposal-cost">${formatCurrency(p.proposedCost)}</div>
      ${statusBadge(p.status)}
      ${p.status === 'pending' ? `
        <div class="proposal-actions">
          <button class="btn btn-success btn-sm" id="accept-${p.serviceId}-${p.workerPhone}" onclick="handleProposal('${p.serviceId}','accepted','${p.workerPhone}')">Accept</button>
          <button class="btn btn-danger btn-sm" id="reject-${p.serviceId}-${p.workerPhone}" onclick="handleProposal('${p.serviceId}','rejected','${p.workerPhone}')">Reject</button>
        </div>
      ` : ''}
      <div class="contact-actions">
        <a href="/chat.html?phone=${p.workerPhone}&name=${encodeURIComponent(p.workerName || p.workerPhone)}" class="btn btn-chat">
          <span class="material-icons-outlined" style="font-size:1rem;">chat</span> Chat
        </a>
        <a href="tel:+91${p.workerPhone}" class="btn btn-call">
          <span class="material-icons-outlined" style="font-size:1rem;">call</span> Call
        </a>
      </div>
    </div>
  `).join('');
}

async function handleProposal(serviceId, status, workerPhone) {
  const data = await apiRequest(`/api/proposals/${serviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, workerPhone }),
  });
  if (data) {
    showToast(`Proposal ${status}!`, status === 'accepted' ? 'success' : 'info');
    loadDashboard();
  }
}
