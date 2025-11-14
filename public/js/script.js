// Real-time Object Detection with Roboflow
(function() {
  'use strict';

  // ========================================
  // ROBOFLOW CONFIGURATION
  // ========================================
  const ROBOFLOW_CONFIG = {
    apiKey: 'MvAPSE6lMWD1bxEBRpJZ',
    workspaceId: 'objdetection-dtu2z',
    modelId: 'trial-sjo4y',  // CORRECTED: was trial-sjo4y-instant-1
    version: '1',
    confidenceThreshold: 40, // 40% minimum confidence
    overlapThreshold: 30,
    maxObjects: 20,
    fps: 4, // Detection frames per second
    apiBase: 'https://detect.roboflow.com' // Hosted API base
  };

  // ========================================
  // COLOR CONFIGURATION
  // ========================================
  const OBJECT_COLORS = {
    'people': '#FF0000',      // Red
    'person': '#FF0000',      // Red (alternative label)
    'stairs': '#FFA500',      // Orange
    'stair': '#FFA500',       // Orange (alternative label)
    'door': '#00FF00',        // Green
    'default': '#00FFFF'      // Cyan for any other objects
  };

  // Priority for announcements (higher = more important)
  const OBJECT_PRIORITY = {
    'stairs': 3,
    'stair': 3,
    'people': 2,
    'person': 2,
    'door': 1
  };

  // ========================================
  // DOM ELEMENTS
  // ========================================
  const videoPreview = document.getElementById('videoPreview');
  const previewContainer = document.querySelector('.image-preview-container');
  
  // Create canvas for drawing bounding boxes
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '10';
  
  let ctx = null;
  let isDetecting = false;
  let detectionInterval = null;
  let model = null;
  let lastAnnouncement = 0;
  let lastDetectedObjects = new Set();

  // ========================================
  // INITIALIZE ROBOFLOW (API-based, no SDK loading needed)
  // ========================================
  async function initializeRoboflow() {
    try {
      console.log('Roboflow Serverless API ready');
      console.log(`Endpoint: https://detect.roboflow.com/${ROBOFLOW_CONFIG.modelId}/${ROBOFLOW_CONFIG.version}`);

      
      // For API-based detection, no initialization needed
      model = { ready: true };
      
      return true;
    } catch (error) {
      console.error('Error initializing Roboflow:', error);
      showError('Failed to initialize detection system');
      return false;
    }
  }

  // ========================================
  // SETUP CANVAS
  // ========================================
  function setupCanvas() {
    if (!previewContainer.contains(canvas)) {
      previewContainer.appendChild(canvas);
    }

    // Match canvas size to video
    const rect = videoPreview.getBoundingClientRect();
    canvas.width = videoPreview.videoWidth || rect.width;
    canvas.height = videoPreview.videoHeight || rect.height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    ctx = canvas.getContext('2d');
  }

  // ========================================
  // START DETECTION
  // ========================================
  async function startDetection() {
    if (isDetecting) return;

    // Initialize Roboflow if needed
    if (!model || !model.ready) {
      const initialized = await initializeRoboflow();
      if (!initialized) {
        showError('Could not initialize object detection');
        return;
      }
    }

    isDetecting = true;
    setupCanvas();

    // Run detection at specified FPS
    const detectionDelay = 1000 / ROBOFLOW_CONFIG.fps;
    
    const runDetection = async () => {
      if (!isDetecting || !videoPreview.srcObject) {
        return;
      }

      try {
        await detectObjects();
      } catch (error) {
        console.error('Detection error:', error);
      }

      // Schedule next detection
      detectionInterval = setTimeout(runDetection, detectionDelay);
    };

    runDetection();
    console.log('Real-time detection started');
  }

  // ========================================
  // STOP DETECTION
  // ========================================
  function stopDetection() {
    isDetecting = false;
    if (detectionInterval) {
      clearTimeout(detectionInterval);
      detectionInterval = null;
    }
    
    // Clear canvas
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    lastDetectedObjects.clear();
    console.log('Detection stopped');
  }

  // ========================================
  // DETECT OBJECTS 
  // ========================================
async function detectObjects() {
  if (!videoPreview || !videoPreview.videoWidth) {
    return;
  }

  try {
    // 1) Get base64 data URL from current frame
    const dataUrl = captureVideoFrameAsDataURL();
    if (!dataUrl) return;

    // 2) Hosted API endpoint
    const apiUrl = `${ROBOFLOW_CONFIG.apiBase}/${ROBOFLOW_CONFIG.modelId}/${ROBOFLOW_CONFIG.version}`;
    
    // Send the base64 string as the body (no JSON wrapper), like the cURL example
    const response = await fetch(`${apiUrl}?api_key=${ROBOFLOW_CONFIG.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: dataUrl   // "data:image/jpeg;base64,...."
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Roboflow raw response:', data);

    const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
    console.log('Predictions count:', predictions.length);

    const filteredPredictions = predictions.filter(
      p => (p.confidence * 100) >= ROBOFLOW_CONFIG.confidenceThreshold
    );
    console.log('Filtered predictions count:', filteredPredictions.length);

    drawDetections(filteredPredictions);
    announceDetections(filteredPredictions);

  } catch (error) {
    console.error('Error during detection:', error);
  }
}




// Capture current video frame as base64 (no data:image/jpeg prefix)
async function captureVideoFrameAsBase64() {
  try {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoPreview.videoWidth;
    tempCanvas.height = videoPreview.videoHeight;

    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(videoPreview, 0, 0);

    // dataURL looks like "data:image/jpeg;base64,AAAA..."
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
    const parts = dataUrl.split(',');

    // Return only the base64 part (what detect.roboflow.com expects)
    return parts[1] || null;
  } catch (err) {
    console.error('Error capturing frame as base64:', err);
    return null;
  }
}

function captureVideoFrameAsDataURL() {
  try {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoPreview.videoWidth;
    tempCanvas.height = videoPreview.videoHeight;

    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(videoPreview, 0, 0);

    // This gives: "data:image/jpeg;base64,...."
    return tempCanvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Error capturing frame:', error);
    return null;
  }
}



  // ========================================
  // DRAW DETECTIONS
  // ========================================
  function drawDetections(predictions) {
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!predictions || predictions.length === 0) {
      return;
    }

    // Calculate scale factors
    const scaleX = canvas.width / videoPreview.videoWidth;
    const scaleY = canvas.height / videoPreview.videoHeight;

    predictions.forEach(prediction => {
      const label = prediction.class.toLowerCase();
      const confidence = Math.round(prediction.confidence * 100);
      
      // Get color for this object type
      const color = OBJECT_COLORS[label] || OBJECT_COLORS['default'];

      // Calculate box coordinates (Roboflow provides center x,y and width,height)
      const x = (prediction.x - prediction.width / 2) * scaleX;
      const y = (prediction.y - prediction.height / 2) * scaleY;
      const width = prediction.width * scaleX;
      const height = prediction.height * scaleY;

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Draw label background
      const labelText = `${prediction.class} ${confidence}%`;
      ctx.font = 'bold 16px Arial';
      const textMetrics = ctx.measureText(labelText);
      const textHeight = 20;
      const padding = 4;

      ctx.fillStyle = color;
      ctx.fillRect(
        x, 
        y - textHeight - padding, 
        textMetrics.width + padding * 2, 
        textHeight + padding
      );

      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.fillText(labelText, x + padding, y - padding - 2);

      // Add visual alert for stairs (safety priority)
      if (label.includes('stair')) {
        flashBorder(color);
      }
    });
  }

  // ========================================
  // ANNOUNCE DETECTIONS (TEXT-TO-SPEECH)
  // ========================================
  function announceDetections(predictions) {
    if (!predictions || predictions.length === 0) {
      lastDetectedObjects.clear();
      return;
    }

    // Don't announce too frequently (every 3 seconds)
    const now = Date.now();
    if (now - lastAnnouncement < 3000) {
      return;
    }

    // Get unique object types
    const currentObjects = new Set(
      predictions.map(p => p.class.toLowerCase())
    );

    // Check if there are new objects to announce
    const hasNewObjects = Array.from(currentObjects).some(
      obj => !lastDetectedObjects.has(obj)
    );

    if (!hasNewObjects && lastDetectedObjects.size > 0) {
      return; // Don't re-announce same objects
    }

    // Sort by priority
    const sortedObjects = Array.from(currentObjects).sort((a, b) => {
      const priorityA = OBJECT_PRIORITY[a] || 0;
      const priorityB = OBJECT_PRIORITY[b] || 0;
      return priorityB - priorityA;
    });

    // Announce highest priority object
    if (sortedObjects.length > 0) {
      const objectToAnnounce = sortedObjects[0];
      const count = predictions.filter(
        p => p.class.toLowerCase() === objectToAnnounce
      ).length;

      let message = '';
      if (objectToAnnounce.includes('stair')) {
        message = 'Warning! Stairs ahead';
        vibratePhone([200, 100, 200]); // Alert vibration for stairs
      } else if (objectToAnnounce.includes('people') || objectToAnnounce.includes('person')) {
        message = count > 1 ? `${count} people detected` : 'Person detected';
      } else if (objectToAnnounce.includes('door')) {
        message = count > 1 ? `${count} doors detected` : 'Door ahead';
      } else {
        message = `${objectToAnnounce} detected`;
      }

      speak(message);
      lastAnnouncement = now;
      lastDetectedObjects = currentObjects;
    }
  }

  // ========================================
  // TEXT-TO-SPEECH
  // ========================================
  function speak(text) {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      window.speechSynthesis.speak(utterance);
      console.log('Announced:', text);
    } else {
      console.log('Text-to-speech not supported:', text);
    }
  }

  // ========================================
  // VIBRATION (MOBILE)
  // ========================================
  function vibratePhone(pattern) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // ========================================
  // VISUAL ALERT (FLASH BORDER)
  // ========================================
  let flashTimeout = null;
  function flashBorder(color) {
    if (flashTimeout) return; // Don't flash if already flashing

    previewContainer.style.border = `4px solid ${color}`;
    previewContainer.style.boxShadow = `0 0 20px ${color}`;

    flashTimeout = setTimeout(() => {
      previewContainer.style.border = '';
      previewContainer.style.boxShadow = '';
      flashTimeout = null;
    }, 300);
  }

  // ========================================
  // SHOW ERROR
  // ========================================
  function showError(message) {
    const placeholder = document.getElementById('previewPlaceholder');
    if (placeholder) {
      placeholder.textContent = message;
      placeholder.style.color = '#dc3545';
    }
    console.error(message);
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================
  
  // Listen for camera start/stop from camera.js
  document.addEventListener('cameraStarted', () => {
    console.log('Camera started, beginning detection...');
    setTimeout(() => {
      startDetection();
    }, 1000); // Wait 1 second for camera to fully initialize
  });

  document.addEventListener('cameraStopped', () => {
    console.log('Camera stopped, stopping detection...');
    stopDetection();
  });

  // Handle video loaded
  videoPreview.addEventListener('loadedmetadata', () => {
    setupCanvas();
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (isDetecting) {
        setupCanvas();
      }
    }, 250);
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    stopDetection();
  });

  // ========================================
  // INITIALIZE ON LOAD
  // ========================================
  window.addEventListener('DOMContentLoaded', () => {
    console.log('Object Detection System Ready');
    console.log('Using Roboflow Serverless API');
    console.log('Project: objdetection-dtu2z/trial-sjo4y/1');
  });

  // ========================================
  // EXPOSE FUNCTIONS (if needed)
  // ========================================
  window.objectDetection = {
    start: startDetection,
    stop: stopDetection,
    isActive: () => isDetecting
  };

})();