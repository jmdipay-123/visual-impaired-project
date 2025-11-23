// Camera Control Script
(function() {
  'use strict';

  // Get DOM elements
  const useCameraBtn = document.getElementById('useCameraBtn');
  const stopCameraBtn = document.getElementById('stopCameraBtn');
  const videoPreview = document.getElementById('videoPreview');
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const loadingSpinner = document.getElementById('loadingSpinner');

  // Camera state
  let stream = null;
  let isCameraActive = false;
  let startupIndicator = null;
  let recordingIndicator = null;

  // Check if browser supports getUserMedia
  const hasGetUserMedia = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  // ========================================
  // STARTUP PROGRESS INDICATOR
  // ========================================
  
  function createStartupIndicator() {
    // Remove any existing indicator
    if (startupIndicator) {
      startupIndicator.remove();
    }

    startupIndicator = document.createElement('div');
    startupIndicator.id = 'cameraStartupIndicator';
    startupIndicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 30px 40px;
      border-radius: 15px;
      z-index: 100;
      text-align: center;
      min-width: 300px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.3s ease;
    `;

    startupIndicator.innerHTML = `
      <div class="startup-icon" style="font-size: 48px; margin-bottom: 15px;">
        <i class="fas fa-camera" style="color: #FF7A00;"></i>
      </div>
      <div class="startup-message" style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">
        Initializing...
      </div>
      <div class="startup-steps" style="margin-top: 20px;">
        <div class="step" data-step="1" style="display: flex; align-items: center; justify-content: center; margin: 10px 0; opacity: 0.5;">
          <i class="fas fa-circle" style="font-size: 8px; margin-right: 10px;"></i>
          <span>Requesting access</span>
        </div>
        <div class="step" data-step="2" style="display: flex; align-items: center; justify-content: center; margin: 10px 0; opacity: 0.5;">
          <i class="fas fa-circle" style="font-size: 8px; margin-right: 10px;"></i>
          <span>Initializing camera</span>
        </div>
        <div class="step" data-step="3" style="display: flex; align-items: center; justify-content: center; margin: 10px 0; opacity: 0.5;">
          <i class="fas fa-circle" style="font-size: 8px; margin-right: 10px;"></i>
          <span>Starting detection</span>
        </div>
      </div>
    `;

    const previewContainer = document.querySelector('.image-preview-container');
    if (previewContainer) {
      previewContainer.appendChild(startupIndicator);
    }
  }

  // Announce message and wait for audio to complete
  function announceMessage(message) {
    return new Promise((resolve) => {
      // If no speech support, just resolve immediately
      if (!window.speechSynthesis && !window.speak) {
        setTimeout(resolve, 500); // Small delay for visual effect
        return;
      }

      // Check if using TTS (speechSynthesis)
      if (window.speechSynthesis && window.speak) {
        // Create a custom utterance to listen for completion
        const utterance = new SpeechSynthesisUtterance(message);
        
        // Get current language
        const langCode = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
        if (langCode === 'tl' || langCode === 'ta') {
          utterance.lang = 'fil-PH';
        } else if (langCode === 'ceb' || langCode === 'ce') {
          utterance.lang = 'fil-PH';
        } else {
          utterance.lang = 'en-US';
        }

        // Listen for speech end
        utterance.onend = () => {
          setTimeout(resolve, 300); // Small buffer after speech
        };

        utterance.onerror = () => {
          setTimeout(resolve, 500); // Continue even if error
        };

        // Cancel any ongoing speech and speak
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback: use window.speak if available
        if (window.speak) {
          window.speak(message);
        }
        // Estimate speech duration (rough: 150ms per word + base time)
        const wordCount = message.split(' ').length;
        const estimatedDuration = Math.max(1000, wordCount * 150 + 500);
        setTimeout(resolve, estimatedDuration);
      }
    });
  }

  function updateStartupProgress(step, message) {
    if (!startupIndicator) return;

    const messageEl = startupIndicator.querySelector('.startup-message');
    const stepEls = startupIndicator.querySelectorAll('.step');
    
    if (messageEl) {
      messageEl.textContent = message;
    }

    // Highlight current and completed steps
    stepEls.forEach((stepEl, index) => {
      const stepNumber = index + 1;
      const icon = stepEl.querySelector('i');
      
      if (stepNumber < step) {
        // Completed step
        stepEl.style.opacity = '1';
        stepEl.style.color = '#4CAF50';
        icon.className = 'fas fa-check-circle';
        icon.style.color = '#4CAF50';
      } else if (stepNumber === step) {
        // Current step
        stepEl.style.opacity = '1';
        stepEl.style.color = '#FF7A00';
        icon.className = 'fas fa-spinner fa-spin';
        icon.style.color = '#FF7A00';
      } else {
        // Future step
        stepEl.style.opacity = '0.5';
        stepEl.style.color = '#999';
        icon.className = 'fas fa-circle';
      }
    });
  }

  function removeStartupIndicator() {
    if (startupIndicator) {
      startupIndicator.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        if (startupIndicator && startupIndicator.parentNode) {
          startupIndicator.remove();
        }
        startupIndicator = null;
      }, 300);
    }
  }

  // ========================================
  // RECORDING INDICATOR
  // ========================================
  
  function createRecordingIndicator() {
    if (recordingIndicator) return;

    recordingIndicator = document.createElement('div');
    recordingIndicator.id = 'recordingIndicator';
    recordingIndicator.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      display: flex;
      align-items: center;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      z-index: 50;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: fadeIn 0.3s ease;
    `;

    recordingIndicator.innerHTML = `
      <span class="recording-dot" style="
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
        margin-right: 8px;
        animation: pulse 1.5s infinite;
      "></span>
      <span>${window.t ? window.t('cameraActive') : 'Camera active'}</span>
    `;

    const previewContainer = document.querySelector('.image-preview-container');
    if (previewContainer) {
      previewContainer.appendChild(recordingIndicator);
    }
  }

  function removeRecordingIndicator() {
    if (recordingIndicator) {
      recordingIndicator.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        if (recordingIndicator && recordingIndicator.parentNode) {
          recordingIndicator.remove();
        }
        recordingIndicator = null;
      }, 300);
    }
  }

  // ========================================
  // REQUEST CAMERA ACCESS
  // ========================================
  
  async function startCamera() {
    if (!hasGetUserMedia()) {
      showError('Camera is not supported by your browser');
      return;
    }

    try {
      // Create startup indicator
      createStartupIndicator();
      useCameraBtn.disabled = true;

      // Step 1: Requesting camera access
      const step1Message = window.t ? window.t('cameraRequestingAccess') : 'Requesting camera access...';
      updateStartupProgress(1, step1Message);
      await announceMessage(step1Message);

      // Request camera access
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Step 2: Initializing camera
      const step2Message = window.t ? window.t('cameraInitializing') : 'Initializing camera...';
      updateStartupProgress(2, step2Message);
      await announceMessage(step2Message);

      // Set up video element
      videoPreview.srcObject = stream;
      videoPreview.style.display = 'block';
      previewPlaceholder.style.display = 'none';

      // Wait for video to be ready
      await new Promise((resolve) => {
        videoPreview.onloadedmetadata = () => {
          videoPreview.play();
          resolve();
        };
      });

      // Step 3: Detection ready
      const step3Message = window.t ? window.t('cameraDetectionReady') : 'Detection ready';
      updateStartupProgress(3, step3Message);
      await announceMessage(step3Message);

      // Update button states
      isCameraActive = true;
      useCameraBtn.style.display = 'none';
      stopCameraBtn.style.display = 'inline-flex';

      // Remove startup indicator
      removeStartupIndicator();

      // Show recording indicator
      createRecordingIndicator();

      // Dispatch event for detection to start
      document.dispatchEvent(new CustomEvent('cameraStarted'));

    } catch (error) {
      console.error('Error accessing camera:', error);
      
      let errorMessage = 'Failed to access camera';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not meet the required constraints.';
      }

      showError(errorMessage);
      removeStartupIndicator();
      useCameraBtn.disabled = false;
    }
  }

  // Helper function for delays
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================
  // STOP CAMERA
  // ========================================
  
  function stopCamera() {
    if (stream) {
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }

    // Reset UI
    videoPreview.srcObject = null;
    videoPreview.style.display = 'none';
    previewPlaceholder.style.display = 'block';
    previewPlaceholder.textContent = 'Click "Use Camera" to start detection';

    // Update button states
    isCameraActive = false;
    useCameraBtn.style.display = 'inline-flex';
    stopCameraBtn.style.display = 'none';
    useCameraBtn.disabled = false;

    // Remove recording indicator
    removeRecordingIndicator();

    // Optional: Add feedback
    showSuccess('Camera stopped');

    // Dispatch event for detection to stop
    document.dispatchEvent(new CustomEvent('cameraStopped'));
  }

  // ========================================
  // SHOW ERROR/SUCCESS
  // ========================================
  
  function showLoading(show) {
    if (show) {
      loadingSpinner.style.display = 'flex';
      previewPlaceholder.style.display = 'none';
      videoPreview.style.display = 'none';
    } else {
      loadingSpinner.style.display = 'none';
    }
  }

  function showError(message) {
    previewPlaceholder.textContent = message;
    previewPlaceholder.style.display = 'block';
    previewPlaceholder.style.color = '#dc3545';
    
    // Reset color after 5 seconds
    setTimeout(() => {
      previewPlaceholder.style.color = '';
    }, 5000);
  }

  function showSuccess(message) {
    console.log('Success:', message);
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================
  
  useCameraBtn.addEventListener('click', startCamera);
  stopCameraBtn.addEventListener('click', stopCamera);

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (isCameraActive) {
      stopCamera();
    }
  });

  // Handle page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isCameraActive) {
      console.log('Page hidden, camera still active');
    }
  });

  // Check camera permissions on load
  if (hasGetUserMedia()) {
    navigator.permissions.query({ name: 'camera' }).then((result) => {
      if (result.state === 'granted') {
        console.log('Camera permission already granted');
      } else if (result.state === 'prompt') {
        console.log('Camera permission will be requested');
      } else if (result.state === 'denied') {
        console.log('Camera permission denied');
        previewPlaceholder.textContent = 'Camera access denied. Please enable camera permissions in your browser settings.';
      }
    }).catch(() => {
      console.log('Permissions API not supported');
    });
  } else {
    previewPlaceholder.textContent = 'Camera is not supported by your browser';
    useCameraBtn.disabled = true;
    useCameraBtn.style.opacity = '0.5';
    useCameraBtn.style.cursor = 'not-allowed';
  }

  // ========================================
  // REMOTE CAMERA CONTROL API
  // ========================================
  
  if (typeof window !== 'undefined') {
    window.remoteCamera = {
      start() {
        if (!isCameraActive) {
          startCamera();
        }
      },
      stop() {
        if (isCameraActive) {
          stopCamera();
        }
      },
      isActive() {
        return isCameraActive;
      }
    };
  }

  // ========================================
  // ADD CSS ANIMATIONS
  // ========================================
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.9);
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.6;
        transform: scale(0.8);
      }
    }
    
    #cameraStartupIndicator .startup-steps .step {
      transition: all 0.3s ease;
    }
    
    #recordingIndicator {
      transition: all 0.3s ease;
    }
  `;
  document.head.appendChild(style);

})();