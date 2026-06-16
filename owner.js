document.addEventListener("DOMContentLoaded", () => {
  fetch("http://localhost:3000/proposals")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("proposalsContainer");
      container.innerHTML = "";

      if (data.length === 0) {
        container.innerHTML = "<p>No proposals yet</p>";
        return;
      }

      data.forEach((proposal, index) => {
        const div = document.createElement("div");
        div.style.border = "1px solid #ccc";
        div.style.padding = "10px";
        div.style.margin = "10px 0";

        div.innerHTML = `
          <h4>Service: ${proposal.serviceName}</h4>
          <p>Worker Phone: ${proposal.workerPhone}</p>
          <p>Proposed Cost: ₹${proposal.proposedCost}</p>
          <p>Status: ${proposal.status}</p>

          <button onclick="updateStatus(${index}, 'accepted')">Accept</button>
          <button onclick="updateStatus(${index}, 'rejected')">Reject</button>
        `;

        container.appendChild(div);
      });
    });
});

function updateStatus(index, status) {
  fetch("http://localhost:3000/update-proposal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index, status })
  })
    .then(res => res.text())
    .then(msg => {
      alert(msg);
      location.reload();
    });
}
