function handleLanguageChange(targetLang, transcript) {
  console.log(`[LANGUAGE CHANGE] "${transcript}" → ${targetLang}`);
  showVoiceMessage(`Changing to ${getLanguageName(targetLang)}...`, 'success');
  playConfirmationSound();
  
  if (window.changeLanguage) {
    window.changeLanguage(targetLang);
    
    // Announce change in the NEW language using native TTS
    setTimeout(() => {
      const messages = {
        'en': 'Language changed to English',
        'tl': 'Nilipat ang wika sa Tagalog',
        'ceb': 'Giusab ang pinulongan sa Cebuano'
      };
      
      const message = messages[targetLang] || 'Language changed';
      
      if (window.speak) {
        window.speak(message);
      }
    }, 500);
    
    // Update TTS language if using native
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TTSPlugin) {
      const langMap = {
        'en': 'en-US',
        'tl': 'fil-PH',
        'ceb': 'fil-PH'
      };
      
      window.Capacitor.Plugins.TTSPlugin.setLanguage({
        language: langMap[targetLang] || 'en-US'
      });
    }
  }
}

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
    cursor: move;
    touch-action: none;
    user-select: none;
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
      #pairingBanner.dragging {
        opacity: 0.8;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      }
    </style>
    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;">
      <i class="fas fa-grip-vertical" style="font-size: 10px; opacity: 0.5;"></i>
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

  // === Drag functionality ===
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  // Get initial position from current style
  const rect = banner.getBoundingClientRect();
  xOffset = rect.left;
  yOffset = rect.top;

  function dragStart(e) {
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }

    if (e.target === banner || banner.contains(e.target)) {
      isDragging = true;
      banner.classList.add('dragging');
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    banner.classList.remove('dragging');
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();

      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }

      xOffset = currentX;
      yOffset = currentY;

      // Keep within viewport bounds
      const maxX = window.innerWidth - banner.offsetWidth;
      const maxY = window.innerHeight - banner.offsetHeight;
      
      xOffset = Math.max(0, Math.min(xOffset, maxX));
      yOffset = Math.max(0, Math.min(yOffset, maxY));

      setTranslate(xOffset, yOffset, banner);
    }
  }

  function setTranslate(xPos, yPos, el) {
    el.style.left = xPos + "px";
    el.style.top = yPos + "px";
    el.style.right = "auto";
  }

  // Mouse events
  banner.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);

  // Touch events
  banner.addEventListener("touchstart", dragStart, { passive: false });
  document.addEventListener("touchmove", drag, { passive: false });
  document.addEventListener("touchend", dragEnd);
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