let servicesData = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("Worker JS running");

  const workerPhone = "8888888888"; // later take from login / localStorage

  Promise.all([
    fetch("http://localhost:3000/services").then(res => res.json()),
    fetch("http://localhost:3000/proposals").then(res => res.json())
  ])
  .then(([services, proposals]) => {
    servicesData = services;

    const container = document.getElementById("servicesContainer");
    container.innerHTML = "";

    services.forEach(service => {
      const div = document.createElement("div");
      div.style.border = "1px solid black";
      div.style.padding = "10px";
      div.style.margin = "10px 0";

      div.classList.add("service-card");

div.innerHTML = `
    <h3>${service.serviceName}</h3>

    <div class="details">
        <p><strong>Description:</strong> ${service.description}</p>
        <p><strong>Owner Cost:</strong> ₹${service.cost}</p>
        <p><strong>Location:</strong> ${service.location}</p>
    </div>
`;

      // 🔍 check if this worker already proposed for this service
      const proposal = proposals.find(
        p => p.serviceId === service.serviceId && p.workerPhone === workerPhone
      );

      // ❌ No proposal yet → show input & button
      if (!proposal) {
  div.innerHTML += `

    <button onclick="acceptOwnerCost(${service.serviceId})">
      Accept Owner Cost
    </button>

    <br><br>

    <label>Propose your cost:</label>
    <input type="number" id="cost-${service.serviceId}" placeholder="Enter your price">
    <br><br>
    <button onclick="sendProposal(${service.serviceId})">
      Send Proposal
    </button>
  `;
}
      // ✅ Proposal already sent → show status here itself
      else {
        div.innerHTML += `
          <p><strong>Your Proposed Cost:</strong> ₹${proposal.proposedCost}</p>
          <p><strong>Status:</strong>
            <span style="color:${
              proposal.status === "accepted" ? "green" :
              proposal.status === "rejected" ? "red" : "orange"
            }">
              ${proposal.status}
            </span>
          </p>
        `;
      }

      container.appendChild(div);
    });
  })
  .catch(err => {
    console.error("Error loading worker dashboard:", err);
  });
});

// ---------------- SEND PROPOSAL ----------------
function sendProposal(serviceId) {
  const input = document.getElementById(`cost-${serviceId}`);
  const proposedCost = input.value;

  if (!proposedCost) {
    alert("Please enter a cost");
    return;
  }

  const service = servicesData.find(s => s.serviceId === serviceId);

  fetch("http://localhost:3000/add-proposal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      ownerPhone: service.ownerPhone,
      workerPhone: "8888888888",
      proposedCost: proposedCost
    })
  })
  .then(res => res.text())
  .then(msg => {
    alert(msg);
    location.reload();
  });
}
function acceptOwnerCost(serviceId) {

  const service = servicesData.find(s => s.serviceId === serviceId);

  fetch("http://localhost:3000/add-proposal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      ownerPhone: service.ownerPhone,
      workerPhone: "8888888888",
      proposedCost: service.cost   // 👈 owner cost directly
    })
  })
  .then(res => res.text())
  .then(msg => {
    alert(msg);
    location.reload();
  });
}