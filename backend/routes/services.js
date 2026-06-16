const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const servicesFilePath = path.join(__dirname, "..", "data", "services.json");
const proposalsFilePath = path.join(__dirname, "..", "data", "proposals.json");
const usersFilePath = path.join(__dirname, "..", "data", "users.json");

const VALID_CATEGORIES = [
  "plumbing",
  "electrical",
  "cleaning",
  "carpentry",
  "painting",
  "home-repair",
  "gardening",
  "moving",
  "security",
  "other",
];

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

// Category keyword mapping for smart matching
const CATEGORY_KEYWORDS = {
  plumbing:     ["plumber", "plumbing", "pipe", "tap", "faucet", "drain", "leak", "water"],
  electrical:   ["electrician", "electrical", "wiring", "fan", "switch", "light", "socket", "wire"],
  cleaning:     ["cleaning", "cleaner", "clean", "wash", "mop", "sweep", "floor", "washroom"],
  carpentry:    ["carpenter", "carpentry", "wood", "furniture", "door", "cabinet"],
  painting:     ["painter", "painting", "paint", "wall", "color", "colour"],
  "home-repair":["repair", "fix", "maintenance", "handyman", "home repair"],
  gardening:    ["garden", "gardener", "lawn", "plant", "tree", "landscap"],
  moving:       ["mover", "moving", "shifting", "transport", "packer", "relocation"],
  security:     ["security", "guard", "watchman", "cctv", "gate", "surveillance"],
  other:        [],
};

// Check if a service matches a category (by its category field OR by keyword in name/description)
function matchesCategory(service, category) {
  if (service.category === category) return true;
  const keywords = CATEGORY_KEYWORDS[category] || [];
  const name = (service.serviceName || "").toLowerCase();
  const desc = (service.description || "").toLowerCase();
  return keywords.some((kw) => name.includes(kw) || desc.includes(kw));
}

// GET /api/services - Get all services (public, with optional filters)
router.get("/", (req, res) => {
  try {
    let services = readJSON(servicesFilePath);
    const { search, location, category } = req.query;

    if (search) {
      const q = search.toLowerCase();
      services = services.filter((s) => {
        const name = (s.serviceName || "").toLowerCase();
        const desc = (s.description || "").toLowerCase();
        const cat = (s.category || "").toLowerCase();
        // Also check category keywords for the search term
        const catMatch = Object.entries(CATEGORY_KEYWORDS).some(
          ([catKey, keywords]) => keywords.some((kw) => kw.includes(q) || q.includes(kw)) && matchesCategory(s, catKey)
        );
        return name.includes(q) || desc.includes(q) || cat.includes(q) || catMatch;
      });
    }

    if (location) {
      services = services.filter((s) =>
        (s.location || "").toLowerCase().includes(location.toLowerCase())
      );
    }

    if (category) {
      services = services.filter((s) => matchesCategory(s, category));
    }

    return res.status(200).json({
      success: true,
      services,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching services",
    });
  }
});

// GET /api/services/my - Get logged-in owner's services (Protected, owner only)
router.get("/my", authenticate, (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can access their services",
      });
    }

    const services = readJSON(servicesFilePath);
    const myServices = services.filter((s) => s.ownerPhone === req.user.phone);

    return res.status(200).json({
      success: true,
      services: myServices,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching your services",
    });
  }
});

// POST /api/services - Add a new service (Protected, owner only)
router.post("/", authenticate, (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can add services",
      });
    }

    const { serviceName, description, cost, location, category } = req.body;

    if (!serviceName || !description || !cost || !location || !category) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: serviceName, description, cost, location, category",
      });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    // Get owner name from users data
    const users = readJSON(usersFilePath);
    const owner = users.find((u) => u.phone === req.user.phone);
    const ownerName = owner ? owner.name : req.user.name;

    const services = readJSON(servicesFilePath);

    const newService = {
      serviceId: Date.now(),
      serviceName,
      description,
      cost,
      location,
      category,
      ownerPhone: req.user.phone,
      ownerName,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    services.push(newService);
    writeJSON(servicesFilePath, services);

    return res.status(201).json({
      success: true,
      message: "Service added successfully",
      service: newService,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error adding service",
    });
  }
});

// DELETE /api/services/:id - Delete a service (Protected, owner only)
router.delete("/:id", authenticate, (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can delete services",
      });
    }

    const serviceId = parseInt(req.params.id);
    const services = readJSON(servicesFilePath);
    const serviceIndex = services.findIndex((s) => s.serviceId === serviceId);

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Only the owner who created it can delete
    if (services[serviceIndex].ownerPhone !== req.user.phone) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Remove service
    services.splice(serviceIndex, 1);
    writeJSON(servicesFilePath, services);

    // Also delete related proposals
    let proposals = readJSON(proposalsFilePath);
    proposals = proposals.filter((p) => p.serviceId !== serviceId);
    writeJSON(proposalsFilePath, proposals);

    return res.status(200).json({
      success: true,
      message: "Service deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error deleting service",
    });
  }
});

module.exports = router;
