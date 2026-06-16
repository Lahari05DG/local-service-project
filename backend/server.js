const cors = require("cors");
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path to users.json
const usersFilePath = path.join(__dirname, "data", "users.json");

// Register API
app.post("/register", (req, res) => {
    const { name, phone, password, role, location } = req.body;

    // Read existing users
    const usersData = fs.readFileSync(usersFilePath);
    const users = JSON.parse(usersData);

    // Check if user already exists
    const userExists = users.find(user => user.phone === phone);
    if (userExists) {
        return res.send("User already exists");
    }

    // Create new user
    const newUser = {
        name,
        phone,
        password,
        role,
        location
    };

    users.push(newUser);

    // Save back to file
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    res.send("Registration successful");
});
// Login API
app.post("/login", (req, res) => {
    const { phone, password } = req.body;

    // Read users
    const usersData = fs.readFileSync(usersFilePath);
    const users = JSON.parse(usersData);

    // Find user
    const user = users.find(
        u => u.phone === phone && u.password === password
    );

    if (!user) {
        return res.send("Invalid phone number or password");
    }

    // Role-based redirect
    if (user.role === "owner") {
        res.redirect("http://localhost:5500/owner_dashboard.html");
    } else if (user.role === "worker") {
        res.redirect("http://localhost:5500/worker_dashboard.html");
    } else {
        res.send("Role not found");
    }
});

const servicesFilePath = path.join(__dirname, "data", "services.json");

// Add Service API (Owner)
app.post("/add-service", (req, res) => {
    const {serviceId, serviceName, description, cost, location, ownerPhone } = req.body;

    const servicesData = fs.readFileSync(servicesFilePath);
    const services = JSON.parse(servicesData);

    const newService = {
        serviceId:Date.now(),
        serviceName,
        description,
        cost,
        location,
        ownerPhone
    };

    services.push(newService);

    fs.writeFileSync(servicesFilePath, JSON.stringify(services, null, 2));

    res.send("Service added successfully");
});
// Get all services (Worker)
app.get("/services", (req, res) => {
    const servicesData = fs.readFileSync(servicesFilePath);
    const services = JSON.parse(servicesData);
    res.json(services);
});
const proposalsFilePath = path.join(__dirname, "data", "proposals.json");

// Worker sends proposal
app.post("/add-proposal", (req, res) => {
  const { serviceId, serviceName, ownerPhone, workerPhone, proposedCost } = req.body;

  const proposals = JSON.parse(fs.readFileSync(proposalsFilePath));

  // ✅ NEW CHECK: allow only one proposal per service per worker
  const alreadyProposed = proposals.find(
    p => p.serviceId === serviceId && p.workerPhone === workerPhone
  );

  if (alreadyProposed) {
    return res.send("You have already proposed for this service");
  }

  const newProposal = {
    serviceId,
    serviceName,
    ownerPhone,
    workerPhone,
    proposedCost,
    status: "pending"
  };

  proposals.push(newProposal);
  fs.writeFileSync(proposalsFilePath, JSON.stringify(proposals, null, 2));

  res.send("Proposal sent successfully");
});
// Get proposals (Owner)
app.get("/proposals", (req, res) => {
  const proposals = JSON.parse(fs.readFileSync(proposalsFilePath));
  res.json(proposals);
});

// Update proposal status
app.post("/update-proposal", (req, res) => {
  const { serviceId, status } = req.body;

  const proposals = JSON.parse(fs.readFileSync(proposalsFilePath));

  const proposal = proposals.find(p => p.serviceId === serviceId);

  if (!proposal) {
    return res.send("Proposal not found");
  }

  proposal.status = status;

  fs.writeFileSync(proposalsFilePath, JSON.stringify(proposals, null, 2));
  res.send("Proposal " + status);
});


// Test route
app.get("/", (req, res) => {
    res.send("Backend server is running!");
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});