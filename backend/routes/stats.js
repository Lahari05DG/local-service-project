const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const servicesFilePath = path.join(__dirname, "..", "data", "services.json");
const proposalsFilePath = path.join(__dirname, "..", "data", "proposals.json");

// Helper: read JSON file
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// GET /api/stats (Protected)
router.get("/", authenticate, (req, res) => {
  try {
    const services = readJSON(servicesFilePath);
    const proposals = readJSON(proposalsFilePath);

    if (req.user.role === "owner") {
      const myServices = services.filter((s) => s.ownerPhone === req.user.phone);
      const myProposals = proposals.filter((p) => p.ownerPhone === req.user.phone);

      const totalServices = myServices.length;
      const totalProposals = myProposals.length;
      const accepted = myProposals.filter((p) => p.status === "accepted").length;
      const rejected = myProposals.filter((p) => p.status === "rejected").length;
      const pending = myProposals.filter((p) => p.status === "pending").length;

      return res.status(200).json({
        success: true,
        stats: {
          totalServices,
          totalProposals,
          accepted,
          rejected,
          pending,
        },
      });
    } else {
      // Worker
      const myProposals = proposals.filter((p) => p.workerPhone === req.user.phone);

      const totalProposals = myProposals.length;
      const accepted = myProposals.filter((p) => p.status === "accepted").length;
      const rejected = myProposals.filter((p) => p.status === "rejected").length;
      const pending = myProposals.filter((p) => p.status === "pending").length;
      const successRate =
        totalProposals > 0
          ? Math.round((accepted / totalProposals) * 100)
          : 0;

      return res.status(200).json({
        success: true,
        stats: {
          totalProposals,
          accepted,
          rejected,
          pending,
          successRate,
        },
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching stats",
    });
  }
});

module.exports = router;
