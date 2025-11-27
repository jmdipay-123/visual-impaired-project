// Add test function
window.testMicrophone = async function() {
  console.log('=== MICROPHONE TEST ===');
  
  try {
    console.log('Requesting microphone...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    console.log('✅ SUCCESS! Microphone granted');
    console.log('Stream:', stream);
    console.log('Tracks:', stream.getTracks());
    
    // Stop the stream
    stream.getTracks().forEach(track => {
      console.log('Track:', track.label, 'Enabled:', track.enabled);
      track.stop();
    });
    
    
    return true;
    
  } catch (error) {
    console.error('❌ FAILED');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    alert('❌ FAILED: ' + error.name + '\n' + error.message);
    return false;
  }
};

// Voice Recognition for Language Switching (Hybrid: Web + Native)
(function() {
  'use strict';

  let isListening = false;
  let voiceButton = null;
  let currentLanguage = 'en-US';
  let recognition = null;
  let commandCooldown = false;
  let cooldownTimer = null;

  const isNativeAvailable = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechPlugin;
  const isWebAvailable = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSupported = isNativeAvailable || isWebAvailable;

  console.log('=== SPEECH RECOGNITION DETECTION ===');
  console.log('Native Android:', isNativeAvailable ? '✅' : '❌');
  console.log('Web Speech API:', isWebAvailable ? '✅' : '❌');

  if (!isSupported) {
    console.error('❌ No speech recognition available');
    return;
  }

  const langMap = {
    'en': 'en-US',
    'tl': 'fil-PH',
    'ceb': 'ceb-PH'
  };

  const LANGUAGE_COMMANDS = {
    'change language to english': 'en',
    'switch to english': 'en',
    'use english': 'en',
    'english': 'en',
    'change to english': 'en',
    
    'change language to tagalog': 'tl',
    'switch to tagalog': 'tl',
    'use tagalog': 'tl',
    'tagalog': 'tl',
    'change to tagalog': 'tl',
    
    'change language to cebuano': 'ceb',
    'switch to cebuano': 'ceb',
    'use cebuano': 'ceb',
    'cebuano': 'ceb',
    'sebuano': 'ceb',
    'change to cebuano': 'ceb',
    
    'ilipat ang wika sa english': 'en',
    'gamitin ang english': 'en',
    'ilipat ang wika sa tagalog': 'tl',
    'gamitin ang tagalog': 'tl',
    'ilipat ang wika sa cebuano': 'ceb',
    'gamitin ang cebuano': 'ceb',
    
    'usba ang pinulongan sa english': 'en',
    'gamita ang english': 'en',
    'usba ang pinulongan sa tagalog': 'tl',
    'gamita ang tagalog': 'tl',
    'usba ang pinulongan sa cebuano': 'ceb',
    'gamita ang cebuano': 'ceb'
  };

  function matchLanguageCommand(transcript) {
    const cleanTranscript = transcript.toLowerCase().trim();
    
    if (LANGUAGE_COMMANDS[cleanTranscript]) {
      return LANGUAGE_COMMANDS[cleanTranscript];
    }
    
    for (const [command, lang] of Object.entries(LANGUAGE_COMMANDS)) {
      if (cleanTranscript.includes(command)) {
        return lang;
      }
    }
    
    if (cleanTranscript.includes('english') || cleanTranscript.includes('ingles')) return 'en';
    if (cleanTranscript.includes('tagalog')) return 'tl';
    if (cleanTranscript.includes('cebuano') || cleanTranscript.includes('sebuano') || cleanTranscript.includes('bisaya')) return 'ceb';
    
    return null;
  }

  function getLanguageName(lang) {
    const names = { 'en': 'English', 'tl': 'Tagalog', 'ceb': 'Cebuano' };
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
    if (existingMsg) existingMsg.remove();
    
    const bgColor = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff';
    
    const msgDiv = document.createElement('div');
    msgDiv.id = 'voiceMessage';
    msgDiv.textContent = message;
    msgDiv.style.position = 'fixed';
    msgDiv.style.top = '150px';
    msgDiv.style.left = '50%';
    msgDiv.style.transform = 'translateX(-50%)';
    msgDiv.style.padding = '15px 30px';
    msgDiv.style.background = bgColor;
    msgDiv.style.color = 'white';
    msgDiv.style.borderRadius = '8px';
    msgDiv.style.fontSize = '16px';
    msgDiv.style.fontWeight = '700';
    msgDiv.style.zIndex = '99999';
    msgDiv.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
    msgDiv.style.maxWidth = '90%';
    msgDiv.style.textAlign = 'center';
    
    document.body.appendChild(msgDiv);
    console.log(`[VOICE] ${message}`);
    
    setTimeout(() => {
      if (msgDiv.parentNode) msgDiv.remove();
    }, 3000);
  }

  async function handleLanguageChange(targetLang, transcript) {
    if (commandCooldown) {
      console.log('[COOLDOWN] Ignoring duplicate command');
      return;
    }

    console.log(`[LANGUAGE CHANGE] "${transcript}" -> ${targetLang}`);
    showVoiceMessage(`Changing to ${getLanguageName(targetLang)}...`, 'success');
    playConfirmationSound();
    
    commandCooldown = true;
    if (cooldownTimer) clearTimeout(cooldownTimer);
    cooldownTimer = setTimeout(() => {
      commandCooldown = false;
      console.log('[COOLDOWN] Ready for next command');
    }, 5000);
    
    if (window.changeLanguage) {
      window.changeLanguage(targetLang);
      currentLanguage = langMap[targetLang] || 'en-US';
      
      if (recognition) {
        recognition.lang = currentLanguage;
      }
      
      // Announce in new language using native TTS
      setTimeout(async () => {
        const message = getLanguageChangedMessage(targetLang);
        const language = langMap[targetLang] || 'en-US';
        
        console.log('[LANGUAGE CHANGE] Announcing:', message, 'in', language);
        
        // Try native TTS first
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TTSPlugin) {
            speakNative(message, language);
          } else if (window.speak) {
            window.speak(message);
          }
      }, 500);
    }
  }

  async function startNativeSpeech() {
    if (!isNativeAvailable) return;

    try {
      showVoiceMessage('🎤 Listening...', 'info');
      isListening = true;
      updateVoiceButton(true);

      const result = await window.Capacitor.Plugins.SpeechPlugin.startListening({
        language: currentLanguage
      });

      console.log('[NATIVE] Heard:', result.transcript);
      showVoiceMessage(`Heard: "${result.transcript}"`, 'info');

      const targetLang = matchLanguageCommand(result.transcript);
      if (targetLang) {
        await handleLanguageChange(targetLang, result.transcript);
      } else {
        showVoiceMessage('Command not recognized', 'error');
      }

      setTimeout(() => {
        if (isListening) {
          startNativeSpeech();
        }
      }, 1000);

    } catch (error) {
      console.error('[NATIVE] Error:', error);
      showVoiceMessage('Speech recognition error', 'error');
      isListening = false;
      updateVoiceButton(false);
    }
  }

  function stopNativeSpeech() {
    isListening = false;
    updateVoiceButton(false);
    showVoiceMessage('Stopped listening', 'info');
  }

  function initializeWebSpeech() {
    if (!isWebAvailable) return false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.lang = currentLanguage;

    recognition.onresult = async (event) => {
      const results = event.results[event.results.length - 1];
      
      for (let i = 0; i < results.length; i++) {
        const transcript = results[i].transcript.toLowerCase().trim();
        console.log('[WEB] Heard:', transcript);
        
        showVoiceMessage(`Heard: "${transcript}"`, 'info');
        
        const targetLang = matchLanguageCommand(transcript);
        if (targetLang) {
          await handleLanguageChange(targetLang, transcript);
          break;
        } else {
          setTimeout(() => {
            showVoiceMessage('Command not recognized', 'error');
          }, 1000);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('[WEB] Error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
      } else if (event.error === 'not-allowed') {
        stopWebSpeech();
        showVoiceMessage('Microphone access denied', 'error');
      } else if (event.error === 'aborted') {
        console.log('Recognition aborted, will restart if still active');
      } else {
        console.error('Recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      console.log('[WEB] Recognition ended');
      
      if (isListening) {
        console.log('[WEB] Restarting recognition...');
        setTimeout(() => {
          if (isListening) {
            try {
              recognition.start();
            } catch (error) {
              console.log('[WEB] Restart error (already running?):', error);
            }
          }
        }, 500);
      }
    };

    return true;
  }

  async function startWebSpeech() {
    if (!isWebAvailable) return;

    if (!recognition) {
      initializeWebSpeech();
    }

    try {
      recognition.start();
      isListening = true;
      updateVoiceButton(true);
      showVoiceMessage('🎤 Listening for commands...', 'info');
      console.log('[WEB] Voice recognition started');
    } catch (error) {
      if (error.message && error.message.includes('already started')) {
        console.log('[WEB] Already running');
        isListening = true;
        updateVoiceButton(true);
      } else {
        console.error('[WEB] Error starting:', error);
        showVoiceMessage('Could not start voice recognition', 'error');
      }
    }
  }

  function stopWebSpeech() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
      updateVoiceButton(false);
      showVoiceMessage('Stopped listening', 'info');
      console.log('[WEB] Voice recognition stopped');
    }
  }

  function startListening() {
    if (isNativeAvailable) {
      console.log('Using Native Android speech');
      startNativeSpeech();
    } else if (isWebAvailable) {
      console.log('Using Web Speech API');
      startWebSpeech();
    }
  }

  function stopListening() {
    if (isNativeAvailable) {
      stopNativeSpeech();
    } else if (isWebAvailable) {
      stopWebSpeech();
    }
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

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

  function createVoiceButton() {
    voiceButton = document.createElement('button');
    voiceButton.id = 'voiceRecognitionBtn';
    voiceButton.className = 'voice-btn';
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceButton.setAttribute('aria-label', 'Start voice commands');
    voiceButton.onclick = toggleListening;
    
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
      display: block;
    `;
    
    voiceButton.addEventListener('mouseenter', () => {
      voiceButton.style.transform = 'scale(1.1)';
    });
    
    voiceButton.addEventListener('mouseleave', () => {
      voiceButton.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(voiceButton);
    
    console.log(`✅ Voice button created`);
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .voice-btn.listening {
        background: #dc3545 !important;
        animation: pulse 1.5s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
        50% { box-shadow: 0 4px 20px rgba(255, 122, 0, 0.6); }
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

  document.addEventListener('languageChanged', (event) => {
    const newLang = event.detail.language;
    currentLanguage = langMap[newLang] || 'en-US';
    
    if (recognition) {
      recognition.lang = currentLanguage;
    }
    
    console.log('Voice recognition language updated to:', currentLanguage);
  });

  window.addEventListener('DOMContentLoaded', () => {
    addStyles();
    createVoiceButton();
    console.log(`✅ Voice recognition ready`);
  });

  window.addEventListener('beforeunload', () => {
    stopListening();
  });

  window.voiceRecognition = {
    start: startListening,
    stop: stopListening,
    toggle: toggleListening,
    isListening: () => isListening,
    isSupported: () => isSupported
  };

})();