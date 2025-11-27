// === Pairing Code Generator ===
function generatePairingCode() {
  const prefix = "CANE-";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars: I, O, 0, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + code;
}

// === Device detection ===
const params = new URLSearchParams(window.location.search);
let deviceId = params.get("device");

if (!deviceId) {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  const isAndroid = /Android/i.test(ua);
  const isWebView =
    /\bwv\b/i.test(ua) ||
    (/\bVersion\/\d+\.\d+\b/i.test(ua) && !/Chrome\/\d+/i.test(ua));

  if (isAndroid && isWebView) {
    deviceId = "vision-device-1";
  }
}

if (!deviceId) {
  console.log("[remote-device] Not in device mode → skipping Socket.IO setup");
} else {
  console.log("[remote-device] Device mode detected with deviceId:", deviceId);

  // 🔐 Generate unique pairing code for this session
  const pairingCode = generatePairingCode();
  let isPaired = false;

  console.log("═════════════════════════════════");
  console.log("🔐 PAIRING CODE:", pairingCode);
  console.log("📱 Device ID:", deviceId);
  console.log("═════════════════════════════════");

  // === Display Pairing Code on Screen ===
  function displayPairingBanner() {
  // Remove existing banner if any
  const existingBanner = document.getElementById("pairingBanner");
  if (existingBanner) existingBanner.remove();

  const banner = document.createElement("div");
  banner.id = "pairingBanner";
  banner.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: linear-gradient(135deg, #FF7A00 0%, #e66a00 100%);
    color: white;
    padding: 10px 15px;
    font-family: 'Segoe UI', Arial, sans-serif;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    animation: slideIn 0.5s ease-out;
    max-width: 200px;
  `;

  banner.innerHTML = `
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .pairing-status {
        padding: 3px 10px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-waiting {
        background: rgba(255, 255, 255, 0.2);
        animation: pulse 2s infinite;
      }
      .status-paired {
        background: rgba(76, 175, 80, 0.3);
        color: #4CAF50;
      }
    </style>
    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;">
      <i class="fas fa-lock" style="font-size: 12px;"></i>
      <span>Remote</span>
    </div>
    <div id="pairingCodeDisplay" style="
      font-size: 16px; 
      font-weight: 700; 
      letter-spacing: 2px; 
      font-family: 'Courier New', monospace;
      background: rgba(0,0,0,0.2);
      padding: 6px 12px;
      border-radius: 6px;
      text-align: center;
    ">
      ${pairingCode}
    </div>
    <div id="pairingStatus" class="pairing-status status-waiting">
      Waiting...
    </div>
  `;

  document.body.appendChild(banner);
}

  function updatePairingStatus(paired) {
    const statusEl = document.getElementById("pairingStatus");
    if (statusEl) {
      if (paired) {
        statusEl.textContent = "✓ Paired & Ready";
        statusEl.className = "pairing-status status-paired";
        
        // Auto-hide banner after 3 seconds when paired
        setTimeout(() => {
          const banner = document.getElementById("pairingBanner");
          if (banner) {
            banner.style.transition = "transform 0.5s ease-out, opacity 0.5s ease-out";
            banner.style.transform = "translateY(-100%)";
            banner.style.opacity = "0";
            setTimeout(() => banner.remove(), 500);
          }
        }, 3000);
      } else {
        statusEl.textContent = "Waiting for pairing...";
        statusEl.className = "pairing-status status-waiting";
      }
    }
  }

  // Display banner on page load
  displayPairingBanner();

  // === Socket.IO setup ===
  const socket = io({
    transports: ["websocket", "polling"],
  });

  window.remoteSocket = socket;
  window.remoteDeviceId = deviceId;
  window.remotePairingCode = pairingCode;

  socket.on("connect", () => {
    console.log("[remote-device] ✅ Connected:", socket.id);
    // Register device with pairing code
    socket.emit("registerDevice", { 
      deviceId: deviceId,
      pairingCode: pairingCode 
    });
  });

  // Listen for pairing confirmation
  socket.on("pairingConfirmed", (data) => {
    console.log("[remote-device] 🔐 Pairing confirmed:", data);
    isPaired = true;
    updatePairingStatus(true);
  });

  // Listen for pairing rejection
  socket.on("pairingRejected", (data) => {
    console.warn("[remote-device] ❌ Pairing rejected:", data.reason);
    isPaired = false;
    updatePairingStatus(false);
  });

  socket.on("disconnect", () => {
    console.warn("[remote-device] ❌ Disconnected");
    isPaired = false;
  });

  // --- Helper Functions ---

  function remoteSetLanguage(lang) {
    if (!isPaired) {
      console.warn("[remote-device] ⚠️ Not paired - ignoring command");
      return;
    }

    if (
      window.translations &&
      window.translations[lang] &&
      typeof window.changeLanguage === "function"
    ) {
      console.log("[remote-device] 🌐 Changing language to:", lang);
      window.changeLanguage(lang);
    } else {
      console.warn("[remote-device] ⚠️ Unsupported language:", lang);
    }
  }

  function remoteStartCamera() {
    if (!isPaired) {
      console.warn("[remote-device] ⚠️ Not paired - ignoring command");
      return;
    }

    const btn = document.getElementById("useCameraBtn");
    if (btn) {
      console.log("[remote-device] 📷 START_CAMERA via button click");
      btn.click();

      if (typeof window.startPreview === "function") {
        window.startPreview();
      }
    } else {
      console.warn("[remote-device] ⚠️ useCameraBtn not found");
    }
  }

  function remoteStopCamera() {
    if (!isPaired) {
      console.warn("[remote-device] ⚠️ Not paired - ignoring command");
      return;
    }

    const btn = document.getElementById("stopCameraBtn");
    if (btn) {
      console.log("[remote-device] 📷 STOP_CAMERA via button click");
      btn.click();

      if (typeof window.stopPreview === "function") {
        window.stopPreview();
      }
    } else {
      console.warn("[remote-device] ⚠️ stopCameraBtn not found");
    }
  }

  // --- Main command handler ---
  socket.on("command", (cmd) => {
    console.log("[remote-device] 📨 Command received:", cmd);
    
    if (!isPaired) {
      console.warn("[remote-device] ⚠️ Not paired - command rejected");
      return;
    }

    if (!cmd || !cmd.type) return;

    switch (cmd.type) {
      case "SET_LANGUAGE":
        if (cmd.payload && cmd.payload.lang) {
          remoteSetLanguage(cmd.payload.lang);
        }
        break;

      case "START_CAMERA":
        remoteStartCamera();
        break;

      case "STOP_CAMERA":
        remoteStopCamera();
        break;

      default:
        console.warn("[remote-device] ⚠️ Unknown command type:", cmd.type);
    }
  });
}