document.addEventListener("DOMContentLoaded", async () => {

  // get owner phone (same logic you already use)
  const ownerPhone = "9390632322"; // OR from localStorage if you stored it

  const servicesRes = await fetch("http://localhost:3000/services");
  const services = await servicesRes.json();

  const proposalsRes = await fetch("http://localhost:3000/proposals");
  const proposals = await proposalsRes.json();

  const container = document.getElementById("servicesContainer");
  container.innerHTML = "";

  if (services.length === 0) {
    container.innerHTML = "<p>No services added yet</p>";
    return;
  }

  services
    .filter(service => String(service.ownerPhone) === String(ownerPhone))
    .forEach(service => {

      const serviceDiv = document.createElement("div");
      serviceDiv.className = "service-card";   // USES YOUR EXISTING STYLE

      serviceDiv.innerHTML = `
        <h3>${service.serviceName}</h3>
        <p><strong>Description:</strong> ${service.description}</p>
        <p><strong>Owner Cost:</strong> ₹${service.cost}</p>
        <p><strong>Location:</strong> ${service.location}</p>
        <h4>Proposals</h4>
      `;

      const relatedProposals = proposals.filter(
  p => p.serviceId === service.serviceId
);


      if (relatedProposals.length === 0) {
        serviceDiv.innerHTML += "<p>No proposals yet</p>";
      } else {
        relatedProposals.forEach((p, index) => {
          serviceDiv.innerHTML += `
            <div class="proposal">
              <p><strong>Worker Phone:</strong> ${p.workerPhone}</p>
              <p><strong>Proposed Cost:</strong> ₹${p.proposedCost}</p>
              <p><strong>Status:</strong> ${p.status}</p>

              ${
                p.status === "pending"
                  ? `<button onclick="updateStatus(${p.serviceId}, 'accepted')">Accept</button>
                    <button onclick="updateStatus(${p.serviceId}, 'rejected')">Reject</button>`
                  : ""
              }
            </div>
          `;
        });
      }

      container.appendChild(serviceDiv);
    });
});

function updateStatus(serviceId, status) {
  fetch("http://localhost:3000/update-proposal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceId, status })
  })
  .then(res => res.text())
  .then(msg => {
    alert(msg);
    location.reload();
  });
}
function acceptOwnerCost(index) {

  const service = servicesData[index];

  fetch("http://localhost:3000/add-proposal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      ownerPhone: service.ownerPhone,
      workerPhone: workerPhone,
      proposedCost: service.cost   // 👈 owner original cost
    })
  })
  .then(res => res.text())
  .then(msg => {
    alert(msg);
    location.reload();
  });

}