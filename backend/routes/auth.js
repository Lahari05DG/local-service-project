const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticate, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

const usersFilePath = path.join(__dirname, "..", "data", "users.json");

// Helper: read users from file
function readUsers() {
  try {
    const data = fs.readFileSync(usersFilePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper: write users to file
function writeUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, role, location } = req.body;

    // Validate all fields required
    if (!name || !phone || !password || !role || !location) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, phone, password, role, location",
      });
    }

    // Validate role
    if (role !== "owner" && role !== "worker") {
      return res.status(400).json({
        success: false,
        message: "Role must be 'owner' or 'worker'",
      });
    }

    // Validate phone (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits",
      });
    }

    const users = readUsers();

    // Check if phone already exists
    const existingUser = users.find((u) => u.phone === phone);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      phone,
      password: hashedPassword,
      role,
      location,
    };

    users.push(newUser);
    writeUsers(users);

    // Generate JWT token
    const token = jwt.sign(
      { phone, name, role, location },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: { name, phone, role, location },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password are required",
      });
    }

    const users = readUsers();
    const user = users.find((u) => u.phone === phone);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { phone: user.phone, name: user.name, role: user.role, location: user.location },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { name: user.name, phone: user.phone, role: user.role, location: user.location },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

// GET /api/auth/profile (Protected)
router.get("/profile", authenticate, (req, res) => {
  try {
    const users = readUsers();
    const user = users.find((u) => u.phone === req.user.phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: { name: user.name, phone: user.phone, role: user.role, location: user.location },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile",
    });
  }
});

// PUT /api/auth/profile (Protected)
router.put("/profile", authenticate, (req, res) => {
  try {
    const { name, location } = req.body;
    const users = readUsers();
    const userIndex = users.findIndex((u) => u.phone === req.user.phone);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Partial update
    if (name !== undefined) users[userIndex].name = name;
    if (location !== undefined) users[userIndex].location = location;

    writeUsers(users);

    const updatedUser = users[userIndex];

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      user: {
        name: updatedUser.name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        location: updatedUser.location,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error updating profile",
    });
  }
});

module.exports = router;
