import express from "express";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import multer from "multer";
import cors from "cors";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io"; 

dotenv.config();
 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
 
const SSL_KEY = path.join(__dirname, "server.key");
const SSL_CERT = path.join(__dirname, "server.cert");
const ENV = process.env.NODE_ENV || "development";
 
// HTTPS logic for development
let server;
if (
  ENV === "development" &&
  fs.existsSync(SSL_KEY) &&
  fs.existsSync(SSL_CERT)
) {
  server = https.createServer(
    {
      key: fs.readFileSync(SSL_KEY),
      cert: fs.readFileSync(SSL_CERT),
    },
    app
  );
  console.log("✅ HTTPS enabled for development");
} else {
  server = http.createServer(app);
  console.log("✅ HTTP enabled for production");
}

// 🔐 Pairing Session Management
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(",") 
      : "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Store active device sessions
// Structure: { deviceId: { socketId, pairingCode, pairedControllers: [socketId] } }
const deviceSessions = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);
  console.log("   Transport:", socket.conn.transport.name);

  // === DEVICE REGISTRATION (Phone) ===
  socket.on("registerDevice", ({ deviceId, pairingCode }) => {
    if (!deviceId || !pairingCode) {
      console.warn("⚠️ Invalid registration - missing deviceId or pairingCode");
      return;
    }

    console.log("📱 Device registering:", deviceId);
    console.log("🔐 Pairing code:", pairingCode);

    // Store device session
    deviceSessions.set(deviceId, {
      socketId: socket.id,
      pairingCode: pairingCode,
      pairedControllers: []
    });

    // Join device room
    socket.join(`device:${deviceId}`);
    
    console.log("✅ Device registered:", deviceId);
    console.log("📊 Active devices:", deviceSessions.size);
  });

  // === CONTROLLER PAIRING ===
  socket.on("pairDevice", ({ deviceId, pairingCode }) => {
    if (!deviceId || !pairingCode) {
      socket.emit("pairingFailed", { reason: "Invalid pairing request" });
      return;
    }

    console.log("🔐 Pairing attempt:");
    console.log("   Controller:", socket.id);
    console.log("   Device:", deviceId);
    console.log("   Code:", pairingCode);

    // Check if device exists
    const deviceSession = deviceSessions.get(deviceId);
    if (!deviceSession) {
      console.warn("❌ Device not found:", deviceId);
      socket.emit("pairingFailed", { reason: "Device not connected" });
      return;
    }

    // Verify pairing code
    if (deviceSession.pairingCode !== pairingCode) {
      console.warn("❌ Invalid pairing code");
      socket.emit("pairingFailed", { reason: "Invalid pairing code" });
      return;
    }

    // Pairing successful!
    console.log("✅ Pairing successful");
    
    // Add controller to paired list
    if (!deviceSession.pairedControllers.includes(socket.id)) {
      deviceSession.pairedControllers.push(socket.id);
    }

    // Join controller room
    socket.join(`controller:${deviceId}`);

    // Notify controller
    socket.emit("pairingSuccess", { 
      deviceId: deviceId,
      pairingCode: pairingCode 
    });

    // Notify device
    io.to(deviceSession.socketId).emit("pairingConfirmed", {
      controllerId: socket.id
    });

    console.log("📊 Device", deviceId, "now has", deviceSession.pairedControllers.length, "paired controller(s)");
  });

  // === SEND COMMAND (from Controller to Device) ===
  socket.on("sendCommand", ({ deviceId, pairingCode, command }) => {
    if (!deviceId || !pairingCode || !command) {
      console.warn("⚠️ Invalid command - missing parameters");
      return;
    }

    const deviceSession = deviceSessions.get(deviceId);
    if (!deviceSession) {
      console.warn("⚠️ Device not found:", deviceId);
      return;
    }

    // Verify pairing code
    if (deviceSession.pairingCode !== pairingCode) {
      console.warn("⚠️ Invalid pairing code for command");
      return;
    }

    // Verify controller is paired
    if (!deviceSession.pairedControllers.includes(socket.id)) {
      console.warn("⚠️ Controller not paired:", socket.id);
      return;
    }

    console.log("📨 Command:", command.type);
    console.log("   From controller:", socket.id);
    console.log("   To device:", deviceId);

    // Send command to device
    io.to(`device:${deviceId}`).emit("command", command);

    // Acknowledge to controller
    socket.emit("commandSent", { 
      deviceId: deviceId, 
      command: command, 
      timestamp: Date.now() 
    });
  });

  // === DEVICE STATUS UPDATE ===
  socket.on("deviceStatus", (status) => {
    console.log("📊 Device status:", socket.id, status);
    // Broadcast to all paired controllers
    socket.broadcast.emit("deviceStatus", { ...status, socketId: socket.id });
  });

  // === VIDEO FRAME (for live preview) ===
  socket.on("previewFrame", (data) => {
    if (!data || !data.deviceId) return;
    
    // Forward to all paired controllers
    const deviceSession = deviceSessions.get(data.deviceId);
    if (deviceSession) {
      deviceSession.pairedControllers.forEach(controllerId => {
        io.to(controllerId).emit("previewFrame", data);
      });
    }
  });

  // === DISCONNECT ===
  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", socket.id, "Reason:", reason);

    // Check if this was a device
    for (const [deviceId, session] of deviceSessions.entries()) {
      if (session.socketId === socket.id) {
        console.log("📱 Device disconnected:", deviceId);
        
        // Notify all paired controllers
        session.pairedControllers.forEach(controllerId => {
          io.to(controllerId).emit("deviceDisconnected", { deviceId });
        });
        
        deviceSessions.delete(deviceId);
        console.log("📊 Active devices:", deviceSessions.size);
        break;
      }

      // Check if this was a paired controller
      const controllerIndex = session.pairedControllers.indexOf(socket.id);
      if (controllerIndex > -1) {
        console.log("🎮 Controller disconnected from device:", deviceId);
        session.pairedControllers.splice(controllerIndex, 1);
      }
    }
  });

  socket.on("error", (error) => {
    console.error("⚠️ Socket error:", socket.id, error);
  });
});
 
// Middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));
 
// File Upload Handling
const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static("uploads"));
 
// Redirect root "/" to "/home"
app.get("/", (req, res) => {
  res.redirect("/home");
});
 
if (ENV === "development") {
  // Home Page
  app.get("/home", (_, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
  // Analytics Page
  app.get("/analytics", (_, res) => {
    res.sendFile(path.join(__dirname, "public", "analytics.html"));
  });
 
  // Information Page
  app.get("/information", (_, res) => {
    res.sendFile(path.join(__dirname, "public", "information.html"));
  });
 
  // ✅ Unified Upload Endpoint with auto-delete
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    const result = await processUpload({ file: req.file });
    res.json(result);
  });
 
  // GET /history?page=1&limit=10
 
  app.get("/api/history", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await getHistory({ page, limit });
      res.json(result);
    } catch (err) {
      console.error("❌ Failed to fetch history:", err.message);
      res
        .status(500)
        .json({ error: "Failed to fetch classification history." });
    }
  });
 
  // Add the API route
  app.get("/api/summary", async (req, res) => {
    const result = await getDiseaseSummary();
    res.json(result);
  });
 
  app.get("/api/disease-info", async (req, res) => {
    try {
      const info = await getDiseaseInfo();
      res.json(info);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
 
// Clean uploads folder on startup
const uploadsPath = path.join(__dirname, "uploads");
 
if (fs.existsSync(uploadsPath)) {
  fs.readdirSync(uploadsPath).forEach((file) => {
    const filePath = path.join(uploadsPath, file);
    try {
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        console.log(`🗑 Deleted: ${filePath}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to delete ${filePath}:`, err.message);
    }
  });
} else {
  fs.mkdirSync(uploadsPath);
  console.log("📂 Created missing uploads/ directory");
}
 
// Start Server
server.listen(PORT, () => {
  console.log(
    `🚀 Server running at http${
      server instanceof https.Server ? "s" : ""
    }://localhost:${PORT}`
  );
});