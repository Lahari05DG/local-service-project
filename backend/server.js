const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const { JWT_SECRET } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible from routes
app.set("io", io);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "..", "public")));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/services", require("./routes/services"));
app.use("/api/proposals", require("./routes/proposals"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/messages", require("./routes/messages"));

// ── Socket.IO Authentication ──
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// ── Socket.IO Events ──
const messagesFilePath = path.join(__dirname, "data", "messages.json");
const usersFilePath = path.join(__dirname, "data", "users.json");

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf-8")); }
  catch { return []; }
}
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

io.on("connection", (socket) => {
  // Join personal room (identified by phone number)
  socket.join(socket.user.phone);
  console.log(`🟢 ${socket.user.name} (${socket.user.phone}) connected`);

  // Handle sending messages
  socket.on("send_message", (data) => {
    const { to, message } = data;
    if (!to || !message) return;

    const users = readJSON(usersFilePath);
    const sender = users.find((u) => u.phone === socket.user.phone);

    const newMsg = {
      id: Date.now(),
      from: socket.user.phone,
      fromName: sender ? sender.name : socket.user.name,
      to,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Save to file
    const messages = readJSON(messagesFilePath);
    messages.push(newMsg);
    writeJSON(messagesFilePath, messages);

    // Send to recipient
    io.to(to).emit("new_message", newMsg);
    // Confirm to sender
    socket.emit("message_sent", newMsg);
  });

  // Typing indicator
  socket.on("typing", (data) => {
    io.to(data.to).emit("user_typing", {
      from: socket.user.phone,
      name: socket.user.name,
    });
  });

  socket.on("stop_typing", (data) => {
    io.to(data.to).emit("user_stop_typing", { from: socket.user.phone });
  });

  // Mark messages as read
  socket.on("mark_read", (data) => {
    const messages = readJSON(messagesFilePath);
    let updated = false;
    messages.forEach((m) => {
      if (m.from === data.from && m.to === socket.user.phone && !m.read) {
        m.read = true;
        updated = true;
      }
    });
    if (updated) {
      writeJSON(messagesFilePath, messages);
      io.to(data.from).emit("messages_read", { by: socket.user.phone });
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 ${socket.user.name} disconnected`);
  });
});

// Catch-all: serve index.html for any non-API route
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});