const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const messagesFilePath = path.join(__dirname, "..", "data", "messages.json");
const usersFilePath = path.join(__dirname, "..", "data", "users.json");

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch { return []; }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET /api/conversations — list all conversations for current user
router.get("/conversations", authenticate, (req, res) => {
  try {
    const messages = readJSON(messagesFilePath);
    const users = readJSON(usersFilePath);
    const myPhone = req.user.phone;

    // Get all messages involving this user
    const myMessages = messages.filter(
      (m) => m.from === myPhone || m.to === myPhone
    );

    // Group by the OTHER person's phone
    const convMap = {};
    myMessages.forEach((m) => {
      const otherPhone = m.from === myPhone ? m.to : m.from;
      if (!convMap[otherPhone]) {
        convMap[otherPhone] = { phone: otherPhone, messages: [] };
      }
      convMap[otherPhone].messages.push(m);
    });

    // Build conversation list
    const conversations = Object.values(convMap).map((conv) => {
      const sorted = conv.messages.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      const lastMsg = sorted[0];
      const unread = sorted.filter(
        (m) => m.to === myPhone && !m.read
      ).length;
      const otherUser = users.find((u) => u.phone === conv.phone);

      return {
        phone: conv.phone,
        name: otherUser ? otherUser.name : conv.phone,
        role: otherUser ? otherUser.role : "unknown",
        lastMessage: lastMsg.message,
        lastTimestamp: lastMsg.timestamp,
        unread,
      };
    });

    // Sort by most recent
    conversations.sort(
      (a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
    );

    return res.json({ success: true, conversations });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/messages/:phone — get messages between current user and another
router.get("/:phone", authenticate, (req, res) => {
  try {
    const messages = readJSON(messagesFilePath);
    const users = readJSON(usersFilePath);
    const myPhone = req.user.phone;
    const otherPhone = req.params.phone;

    const conversation = messages
      .filter(
        (m) =>
          (m.from === myPhone && m.to === otherPhone) ||
          (m.from === otherPhone && m.to === myPhone)
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Mark messages as read
    let updated = false;
    const allMessages = readJSON(messagesFilePath);
    allMessages.forEach((m) => {
      if (m.from === otherPhone && m.to === myPhone && !m.read) {
        m.read = true;
        updated = true;
      }
    });
    if (updated) writeJSON(messagesFilePath, allMessages);

    const otherUser = users.find((u) => u.phone === otherPhone);

    return res.json({
      success: true,
      messages: conversation,
      otherUser: otherUser
        ? { name: otherUser.name, phone: otherUser.phone, role: otherUser.role }
        : { name: otherPhone, phone: otherPhone, role: "unknown" },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/messages — send a message (REST fallback, main flow via Socket.IO)
router.post("/", authenticate, (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, message: "to and message required" });
    }

    const messages = readJSON(messagesFilePath);
    const users = readJSON(usersFilePath);
    const sender = users.find((u) => u.phone === req.user.phone);

    const newMsg = {
      id: Date.now(),
      from: req.user.phone,
      fromName: sender ? sender.name : req.user.name,
      to,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    messages.push(newMsg);
    writeJSON(messagesFilePath, messages);

    // Emit via Socket.IO if available
    const io = req.app.get("io");
    if (io) {
      io.to(to).emit("new_message", newMsg);
    }

    return res.status(201).json({ success: true, message: "Message sent", data: newMsg });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
