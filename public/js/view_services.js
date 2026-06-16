/* ============================================
   View Services & Proposals Logic (Owner)
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  if (!requireRole('owner')) return;
  renderDashboardNavbar('owner');
  loadMyServices();
});

async function loadMyServices() {
  const container = document.getElementById('services-container');

  const [servicesData, proposalsData] = await Promise.all([
    apiRequest('/api/services/my'),
    apiRequest('/api/proposals'),
  ]);

  const services = servicesData ? servicesData.services : [];
  const proposals = proposalsData ? proposalsData.proposals : [];

  if (services.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No services posted yet</h3>
        <p>Start by posting your first service request</p>
        <a href="/add_service.html" class="btn btn-primary">
          <span class="material-icons-outlined">add_circle</span> Add Service
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = services.map(service => {
    const serviceProposals = proposals.filter(p => p.serviceId === service.serviceId);
    const catIcon = getCategoryIcon(service.category);
    const catLabel = getCategoryLabel(service.category);

    return `
      <div class="service-detail-card" id="service-${service.serviceId}" style="animation:fadeIn 0.5s ease-out both;">
        <div class="service-detail-header">
          <h3>
            <span class="badge badge-category">${catIcon} ${catLabel}</span>
            ${service.serviceName}
          </h3>
          <button class="btn btn-danger btn-sm btn-icon" id="delete-${service.serviceId}" onclick="deleteService(${service.serviceId})" title="Delete service">
            <span class="material-icons-outlined">delete</span>
          </button>
        </div>
        <div class="service-detail-body">
          <p style="margin-bottom:12px;">${service.description || 'No description'}</p>
          <div class="service-meta">
            <span><span class="material-icons-outlined" style="font-size:1rem;">currency_rupee</span> ${formatCurrency(service.cost)}</span>
            <span><span class="material-icons-outlined" style="font-size:1rem;">location_on</span> ${service.location || '—'}</span>
            <span><span class="material-icons-outlined" style="font-size:1rem;">calendar_today</span> ${formatDate(service.createdAt)}</span>
          </div>
        </div>
        <div class="proposals-list">
          <h4>Proposals (${serviceProposals.length})</h4>
          ${serviceProposals.length === 0
            ? '<p style="color:var(--text-light);font-size:0.9rem;">No proposals yet</p>'
            : serviceProposals.map(p => `
              <div class="proposal-card" id="proposal-${p.serviceId}-${p.workerPhone}">
                <div class="proposal-info">
                  <h4>${p.workerName || 'Worker'}</h4>
                  <span>📱 ${p.workerPhone}</span>
                </div>
                <div class="proposal-cost">${formatCurrency(p.proposedCost)}</div>
                ${statusBadge(p.status)}
                ${p.status === 'pending' ? `
                  <div class="proposal-actions">
                    <button class="btn btn-success btn-sm" onclick="handleProposal(${p.serviceId},'accepted','${p.workerPhone}')">
                      <span class="material-icons-outlined" style="font-size:1rem;">check</span> Accept
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="handleProposal(${p.serviceId},'rejected','${p.workerPhone}')">
                      <span class="material-icons-outlined" style="font-size:1rem;">close</span> Reject
                    </button>
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
            `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function handleProposal(serviceId, status, workerPhone) {
  const data = await apiRequest(`/api/proposals/${serviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, workerPhone }),
  });
  if (data) {
    showToast(`Proposal ${status}!`, status === 'accepted' ? 'success' : 'info');
    loadMyServices();
  }
}

async function deleteService(serviceId) {
  if (!confirm('Are you sure you want to delete this service? This will also remove all its proposals.')) return;

  const data = await apiRequest(`/api/services/${serviceId}`, {
    method: 'DELETE',
  });
  if (data) {
    showToast('Service deleted', 'success');
    loadMyServices();
  }
}
