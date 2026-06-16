const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const proposalsFilePath = path.join(__dirname, "..", "data", "proposals.json");
const servicesFilePath = path.join(__dirname, "..", "data", "services.json");
const usersFilePath = path.join(__dirname, "..", "data", "users.json");

// Helper: read JSON file
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper: write JSON file
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET /api/proposals - Get proposals (Protected)
// Owner: proposals for their services
// Worker: their own proposals
router.get("/", authenticate, (req, res) => {
  try {
    const proposals = readJSON(proposalsFilePath);

    let filtered;
    if (req.user.role === "owner") {
      // Return proposals for services owned by this user
      filtered = proposals.filter((p) => p.ownerPhone === req.user.phone);
    } else {
      // Worker: return their proposals
      filtered = proposals.filter((p) => p.workerPhone === req.user.phone);
    }

    return res.status(200).json({
      success: true,
      proposals: filtered,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching proposals",
    });
  }
});

// POST /api/proposals - Send a proposal (Protected, worker only)
router.post("/", authenticate, (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can send proposals",
      });
    }

    const { serviceId, proposedCost } = req.body;

    if (!serviceId || !proposedCost) {
      return res.status(400).json({
        success: false,
        message: "serviceId and proposedCost are required",
      });
    }

    // Look up service to get serviceName and ownerPhone
    const services = readJSON(servicesFilePath);
    const service = services.find((s) => s.serviceId === parseInt(serviceId));

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const proposals = readJSON(proposalsFilePath);

    // Check if worker has already proposed for this service
    const alreadyProposed = proposals.find(
      (p) =>
        p.serviceId === parseInt(serviceId) &&
        p.workerPhone === req.user.phone
    );

    if (alreadyProposed) {
      return res.status(400).json({
        success: false,
        message: "Already proposed for this service",
      });
    }

    // Get worker name from users data
    const users = readJSON(usersFilePath);
    const worker = users.find((u) => u.phone === req.user.phone);
    const workerName = worker ? worker.name : req.user.name;

    const newProposal = {
      serviceId: parseInt(serviceId),
      serviceName: service.serviceName,
      ownerPhone: service.ownerPhone,
      workerPhone: req.user.phone,
      workerName,
      proposedCost,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    proposals.push(newProposal);
    writeJSON(proposalsFilePath, proposals);

    return res.status(201).json({
      success: true,
      message: "Proposal sent successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error sending proposal",
    });
  }
});

// PUT /api/proposals/:serviceId - Update proposal status (Protected, owner only)
router.put("/:serviceId", authenticate, (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can update proposal status",
      });
    }

    const { status, workerPhone } = req.body;
    const serviceId = parseInt(req.params.serviceId);

    if (!status || !workerPhone) {
      return res.status(400).json({
        success: false,
        message: "status and workerPhone are required",
      });
    }

    if (status !== "accepted" && status !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "Status must be 'accepted' or 'rejected'",
      });
    }

    // Verify the service belongs to this owner
    const services = readJSON(servicesFilePath);
    const service = services.find((s) => s.serviceId === serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (service.ownerPhone !== req.user.phone) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const proposals = readJSON(proposalsFilePath);

    // Find the specific proposal by serviceId AND workerPhone
    const proposalIndex = proposals.findIndex(
      (p) => p.serviceId === serviceId && p.workerPhone === workerPhone
    );

    if (proposalIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    proposals[proposalIndex].status = status;
    writeJSON(proposalsFilePath, proposals);

    return res.status(200).json({
      success: true,
      message: `Proposal ${status}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error updating proposal",
    });
  }
});

module.exports = router;
