// Voice Recognition for Language Switching
(function() {
  'use strict';

  // ========================================
  // VOICE RECOGNITION SETUP
  // ========================================
  
  let recognition = null;
  let isListening = false;
  let voiceButton = null;

  // Check if browser supports speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;

  // ========================================
  // LANGUAGE COMMANDS (ALL 3 LANGUAGES)
  // ========================================
  
  const LANGUAGE_COMMANDS = {
    // English commands
    'change language to english': 'en',
    'switch to english': 'en',
    'use english': 'en',
    'english': 'en',
    
    'change language to tagalog': 'tl',
    'switch to tagalog': 'tl',
    'use tagalog': 'tl',
    'tagalog': 'tl',
    
    'change language to cebuano': 'ceb',
    'switch to cebuano': 'ceb',
    'use cebuano': 'ceb',
    'cebuano': 'ceb',
    
    // Tagalog commands
    'ilipat ang wika sa english': 'en',
    'gamitin ang english': 'en',
    
    'ilipat ang wika sa tagalog': 'tl',
    'gamitin ang tagalog': 'tl',
    
    'ilipat ang wika sa cebuano': 'ceb',
    'gamitin ang cebuano': 'ceb',
    
    // Cebuano commands
    'usba ang pinulongan sa english': 'en',
    'gamita ang english': 'en',
    
    'usba ang pinulongan sa tagalog': 'tl',
    'gamita ang tagalog': 'tl',
    
    'usba ang pinulongan sa cebuano': 'ceb',
    'gamita ang cebuano': 'ceb'
  };

  // ========================================
  // INITIALIZE VOICE RECOGNITION
  // ========================================
  
  function initializeVoiceRecognition() {
    if (!isSupported) {
      console.log('Voice recognition not supported in this browser');
      return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    
    // Listen in current language
    const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
    setRecognitionLanguage(currentLang);

    // Handle recognition results
    recognition.onresult = (event) => {
      const results = event.results[event.results.length - 1];
      
      // Check all alternatives for a match
      for (let i = 0; i < results.length; i++) {
        const transcript = results[i].transcript.toLowerCase().trim();
        console.log('Voice input:', transcript);
        
        const targetLang = matchLanguageCommand(transcript);
        if (targetLang) {
          handleLanguageChange(targetLang, transcript);
          break;
        }
      }
    };

    // Handle errors
    recognition.onerror = (event) => {
      console.log('Voice recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
      } else if (event.error === 'not-allowed') {
        stopListening();
        showVoiceMessage('Microphone access denied', 'error');
      } else {
        console.error('Recognition error:', event.error);
      }
    };

    // Handle end of recognition
    recognition.onend = () => {
      if (isListening) {
        // Restart recognition if still supposed to be listening
        try {
          recognition.start();
        } catch (error) {
          console.log('Recognition restart error:', error);
        }
      }
    };

    console.log('Voice recognition initialized');
    return true;
  }

  // ========================================
  // SET RECOGNITION LANGUAGE
  // ========================================
  
  function setRecognitionLanguage(lang) {
    if (!recognition) return;
    
    // Map language codes to speech recognition codes
    const langMap = {
      'en': 'en-US',
      'tl': 'fil-PH',
      'ceb': 'ceb-PH'
    };
    
    const recognitionLang = langMap[lang] || 'en-US';
    recognition.lang = recognitionLang;
    console.log('Voice recognition language set to:', recognitionLang);
  }

  // ========================================
  // MATCH LANGUAGE COMMAND
  // ========================================
  
  function matchLanguageCommand(transcript) {
    // Direct match
    if (LANGUAGE_COMMANDS[transcript]) {
      return LANGUAGE_COMMANDS[transcript];
    }
    
    // Partial match - check if transcript contains any command
    for (const [command, lang] of Object.entries(LANGUAGE_COMMANDS)) {
      if (transcript.includes(command)) {
        return lang;
      }
    }
    
    return null;
  }

  // ========================================
  // HANDLE LANGUAGE CHANGE
  // ========================================
  
  function handleLanguageChange(targetLang, transcript) {
    console.log(`Voice command detected: "${transcript}" → ${targetLang}`);
    
    // Show visual feedback
    showVoiceMessage(`Changing to ${getLanguageName(targetLang)}...`, 'success');
    
    // Play confirmation sound (optional)
    playConfirmationSound();
    
    // Change language using translations.js function
    if (window.changeLanguage) {
      window.changeLanguage(targetLang);
      
      // Announce change in the NEW language
      setTimeout(() => {
        const message = getLanguageChangedMessage(targetLang);
        if (window.speak) {
          window.speak(message);
        }
      }, 500);
      
      // Update recognition language to match new UI language
      setRecognitionLanguage(targetLang);
    }
  }

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  function getLanguageName(lang) {
    const names = {
      'en': 'English',
      'tl': 'Tagalog',
      'ceb': 'Cebuano'
    };
    return names[lang] || lang;
  }

  function getLanguageChangedMessage(lang) {
    const messages = {
      'en': 'Language changed to English',
      'tl': 'Nilipat ang wika sa Tagalog',
      'ceb': 'Giusab ang pinulongan sa Cebuano'
    };
    return messages[lang] || 'Language changed';
  }

  function playConfirmationSound() {
    // Simple confirmation beep
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  }

  function showVoiceMessage(message, type = 'info') {
    const existingMsg = document.getElementById('voiceMessage');
    if (existingMsg) {
      existingMsg.remove();
    }
    
    const msgDiv = document.createElement('div');
    msgDiv.id = 'voiceMessage';
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
      position: fixed;
      top: 140px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: ${type === 'error' ? '#dc3545' : '#28a745'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
      msgDiv.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => msgDiv.remove(), 300);
    }, 2000);
  }

  // ========================================
  // START/STOP LISTENING
  // ========================================
  
  async function startListening() {
    if (!isSupported) {
      showVoiceMessage('Voice recognition not supported', 'error');
      return false;
    }
    
    // Request microphone permission explicitly (especially for mobile)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');
    } catch (error) {
      console.error('Microphone permission denied:', error);
      showVoiceMessage('Please allow microphone access', 'error');
      return false;
    }
    
    if (!recognition) {
      const initialized = initializeVoiceRecognition();
      if (!initialized) return false;
    }
    
    try {
      recognition.start();
      isListening = true;
      updateVoiceButton(true);
      
      // Only show message if manually started (not auto-start)
      if (!AUTO_START || voiceButton.classList.contains('listening')) {
        showVoiceMessage('Listening for voice commands...', 'info');
      }
      
      console.log('Voice recognition started');
      return true;
    } catch (error) {
      console.error('Error starting recognition:', error);
      showVoiceMessage('Could not start voice recognition', 'error');
      return false;
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
      updateVoiceButton(false);
      console.log('Voice recognition stopped');
    }
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  // ========================================
  // UPDATE VOICE BUTTON UI
  // ========================================
  
  function updateVoiceButton(listening) {
    if (!voiceButton) return;
    
    const icon = voiceButton.querySelector('i');
    if (listening) {
      voiceButton.classList.add('listening');
      icon.className = 'fas fa-microphone-slash';
      voiceButton.setAttribute('aria-label', 'Stop voice commands');
    } else {
      voiceButton.classList.remove('listening');
      icon.className = 'fas fa-microphone';
      voiceButton.setAttribute('aria-label', 'Start voice commands');
    }
  }

  // ========================================
  // CREATE VOICE BUTTON
  // ========================================
  
  function createVoiceButton() {
    if (!isSupported) {
      console.log('Voice recognition not supported, button not created');
      return;
    }
    
    voiceButton = document.createElement('button');
    voiceButton.id = 'voiceRecognitionBtn';
    voiceButton.className = 'voice-btn';
    
    // Show appropriate icon based on auto-start
    if (AUTO_START) {
      voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
      voiceButton.setAttribute('aria-label', 'Voice commands (always on - click to stop)');
    } else {
      voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
      voiceButton.setAttribute('aria-label', 'Start voice commands');
    }
    
    voiceButton.onclick = toggleListening;
    
    // Add styles
    voiceButton.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #FF7A00;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      transition: all 0.3s ease;
    `;
    
    // Add hover effect
    voiceButton.addEventListener('mouseenter', () => {
      voiceButton.style.transform = 'scale(1.1)';
      voiceButton.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
    });
    
    voiceButton.addEventListener('mouseleave', () => {
      voiceButton.style.transform = 'scale(1)';
      voiceButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });
    
    document.body.appendChild(voiceButton);
    console.log('Voice button created');
    document.getElementById('voiceRecognitionBtn').style.display = 'none';

  }

  // ========================================
  // ADD CSS ANIMATIONS
  // ========================================
  
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      
      @keyframes slideUp {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        50% {
          box-shadow: 0 4px 20px rgba(255, 122, 0, 0.6);
        }
      }
      
      .voice-btn.listening {
        background: #dc3545 !important;
        animation: pulse 1.5s infinite;
      }
      
      @media (max-width: 768px) {
        #voiceRecognitionBtn {
          width: 50px !important;
          height: 50px !important;
          font-size: 20px !important;
          bottom: 20px !important;
          right: 20px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ========================================
  // LISTEN FOR LANGUAGE CHANGES
  // ========================================
  
  document.addEventListener('languageChanged', (event) => {
    const newLang = event.detail.language;
    setRecognitionLanguage(newLang);
  });

  // ========================================
  // AUTO-START CONFIGURATION
  // ========================================
  
  const AUTO_START = true; // Set to false to require button click
  
  // ========================================
  // INITIALIZE ON PAGE LOAD
  // ========================================
  
  window.addEventListener('DOMContentLoaded', async () => {
    addStyles();
    createVoiceButton();
    
    if (isSupported) {
      console.log('Voice recognition available');
      console.log('Voice commands: "Change language to English/Tagalog/Cebuano"');
      
      // Auto-start voice recognition if enabled
      if (AUTO_START) {
        console.log('Auto-starting voice recognition...');
        // Wait a bit for page to fully load
        setTimeout(async () => {
          const started = await startListening();
          if (started) {
            console.log('Voice recognition auto-started successfully');
          } else {
            console.log('Voice recognition auto-start failed - click microphone button to retry');
          }
        }, 1000);
      }
    } else {
      console.log('Voice recognition not supported in this browser');
    }
  });

  // ========================================
  // CLEANUP ON PAGE UNLOAD
  // ========================================
  
  window.addEventListener('beforeunload', () => {
    stopListening();
  });

  // ========================================
  // EXPOSE PUBLIC API
  // ========================================
  
  window.voiceRecognition = {
    start: startListening,
    stop: stopListening,
    toggle: toggleListening,
    isListening: () => isListening,
    isSupported: () => isSupported
  };

})();