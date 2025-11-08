// public/script.js (with debug logging)

console.log('🔍 script.js loaded');

// Grab existing elements by ID
const fileInput = document.getElementById('imageInput');
const analyzeBtn = document.getElementById('analyzeImageBtn');
const videoEl = document.getElementById('videoPreview');
const imageEl = document.getElementById('imagePreview');
const startCamBtn = document.getElementById('startCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const resultImg = document.getElementById('result');
const resultList = document.getElementById('resultList');
const uploadBtn = document.getElementById('uploadBtn');

// UI elements
const previewBox = document.getElementById('previewBox');
const resultBox = document.getElementById('resultBox');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const loadingOverlay = document.getElementById('loadingOverlay');
const detectionCount = document.getElementById('detectionCount');

console.log('📋 Elements found:', {
  fileInput: !!fileInput,
  analyzeBtn: !!analyzeBtn,
  videoEl: !!videoEl,
  imageEl: !!imageEl,
  startCamBtn: !!startCamBtn,
  captureBtn: !!captureBtn,
  resultImg: !!resultImg,
  resultList: !!resultList,
  uploadBtn: !!uploadBtn
});

const hiddenCanvas = document.createElement('canvas');
let activeStream = null;

// ===== OPTIMIZATION: Client-side Image Resize =====
async function resizeImage(blob, maxWidth = 640) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Only resize if image is larger than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with good quality
        canvas.toBlob((resizedBlob) => {
          console.log(`📐 Resized: ${img.width}x${img.height} → ${width}x${height}`);
          console.log(`📦 Size: ${(blob.size / 1024).toFixed(1)}KB → ${(resizedBlob.size / 1024).toFixed(1)}KB`);
          resolve(resizedBlob);
        }, 'image/jpeg', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(blob);
  });
}

const ML_BACKEND = 'https://object-detection-ml-y5v2.onrender.com';

async function postToDetectFromBlob(blob) {
  console.log('📤 Posting to /detect, blob size:', blob.size);

  // Show loading overlay
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
  if (resultPlaceholder) resultPlaceholder.style.display = 'none';
  if (resultBox) resultBox.classList.add('result-active');

  // 1) Warmup ping – wakes service so preflight/POST won’t 502
  try {
    await fetch(`${ML_BACKEND}/health`, { method: 'GET', cache: 'no-store' });
  } catch (e) {
    console.warn('Health warmup failed (continuing):', e);
  }

  // 2) Now do the detect
  const fd = new FormData();
  fd.append('image', blob, 'frame.jpg');

  const res = await fetch(`${ML_BACKEND}/detect`, {
    method: 'POST',
    body: fd,
    // mode: 'cors' // default, ok to omit
  });

  const text = await res.text();
  console.log('📥 Response status:', res.status);

  if (loadingOverlay) loadingOverlay.style.display = 'none';

  if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`);

  let data;
  try { data = JSON.parse(text); } catch { throw new Error(text); }

  if (data.error) throw new Error(data.error);
  console.log('✅ Detection results:', data.detections?.length || 0, 'objects found');
  renderResults(data);
  return data;
}

// ===== RENDER RESULTS =====
async function renderResults(data) {
  console.log('🎨 Rendering results...');

  const dets = Array.isArray(data?.detections) ? data.detections : [];

  // Count badge
  if (detectionCount) {
    const objectsText = dets.length === 1 ? t('object') : t('objects');
    detectionCount.textContent = `${dets.length} ${objectsText}`;
    detectionCount.style.display = 'inline-block';
  }

  // Annotated image
  if (resultImg && data?.image) {
    resultImg.src = `data:image/jpeg;base64,${data.image}`;
    resultImg.style.display = 'block';
    if (resultPlaceholder) resultPlaceholder.style.display = 'none';
    console.log('✅ Annotated image displayed');
  }

  // Normalized detections for TTS
  const detections = dets.map(o => {
    let c = Number(o.conf ?? o.confidence ?? o.score ?? 0);
    if (c > 1) c = c / 100; // normalize to 0..1 if needed
    return {
      label: String(o.label ?? o.name ?? o.class ?? 'object'),
      conf: c
    };
  });

  // Cebuano audio clips first; fallback to server/local TTS
  try {
    const didSpeak = await speakCebuanoDetection(detections);
    if (!didSpeak) {
      const complete = t('voiceAnalysisComplete','Analysis complete');
      const detected = t('voiceDetected','Detected');
      const withWord = t('voiceWith','with');
      const confWord = t('voiceConfidence','confidence');
      const noneText = t('voiceNoObjects','No objects detected in this image');

      let line;
      if (!detections.length) {
        line = `${complete}. ${noneText}.`;
      } else {
        const top = [...detections].sort((a,b) => (b.conf||0) - (a.conf||0))[0];
        const pct = Math.round((top.conf || 0) * 100);
        line = `${complete}. ${detected} ${top.label} ${withWord} ${pct}% ${confWord}.`;
      }
      console.log('🔊 TTS line:', line);
      await speakServer(line).catch(() => speakLocal(line));
    }
  } catch (e) {
    console.warn('TTS announce failed:', e);
  }

  // Results list
  if (resultList) {
    resultList.innerHTML = dets.length
      ? dets.map(d => `
          <li style="padding:12px 15px;margin:8px 0;background:linear-gradient(90deg,#f0f8ff 0%,#ffffff 100%);border-left:4px solid #28A745;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#333;font-weight:500;">
              <i class="fas fa-tag" style="color:#28A745;margin-right:8px;"></i>
              ${d.label}
            </span>
            <span style="background:#28A745;color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">
              ${((Number(d.conf)>1?Number(d.conf)/100:Number(d.conf)) * 100).toFixed(1)}%
            </span>
          </li>`).join('')
      : `<li style="padding:20px;text-align:center;color:#999;font-style:italic;">${t('noObjectsDetected')}</li>`;
    resultList.parentElement && (resultList.parentElement.style.display = 'block');
    console.log('✅ Results list updated');
  }
}


// If Cebuano is active and we have clips, this will speak and return true.
// If not, we fall back to your existing server/client TTS.
const didSpeakCebuano = await speakCebuanoDetection(detections);
if (!didSpeakCebuano) {
  // ... your existing line-building + speakServer(line) or speakLocal()
}


  // Update results list
  if (resultList) {
    const confidenceText = t('confidence');
    resultList.innerHTML = dets.length
      ? dets.map(d => `<li style="padding: 12px 15px; margin: 8px 0; background: linear-gradient(90deg, #f0f8ff 0%, #ffffff 100%); border-left: 4px solid #28A745; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #333; font-weight: 500;">
            <i class="fas fa-tag" style="color: #28A745; margin-right: 8px;"></i>
            ${d.label}
          </span>
          <span style="background: #28A745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${(d.conf * 100).toFixed(1)}%
          </span>
        </li>`).join('')
      : `<li style="padding: 20px; text-align: center; color: #999; font-style: italic;">${t('noObjectsDetected')}</li>`;
    resultList.parentElement.style.display = 'block';
    console.log('✅ Results list updated');
  }

  // --- Speak via server TTS (now safely inside the function that HAS `data`) ---
  try {
    const raw = data?.detections ?? data?.objects ?? data?.results ?? [];
    const detections = (Array.isArray(raw) ? raw : []).map(o => {
      let conf = o.conf ?? o.confidence ?? o.score ?? 0;
      if (conf > 1) conf /= 100; // normalize to 0..1
      return { label: o.label ?? o.name ?? o.class ?? 'object', conf: Number(conf) || 0 };
    });

    const complete = t('voiceAnalysisComplete','Analysis complete');
    const detected = t('voiceDetected','Detected');
    const withWord = t('voiceWith','with');
    const confWord = t('voiceConfidence','confidence');
    const noneText = t('voiceNoObjects','No objects detected in this image');

    let line;
    const sorted = [...detections].sort((a,b) => (b.conf||0) - (a.conf||0));
    if (!sorted.length) {
      line = `${complete}. ${noneText}.`;
    } else {
      const top = sorted[0];
      const pct = Math.round((top.conf || 0) * 100);
      line = `${complete}. ${detected} ${top.label} ${withWord} ${pct}% ${confWord}.`;
    }   
    console.log('🔊 TTS line:', line);
    // will play via the server TTS endpoint
    speakServer(line);
  } catch (e) {
    console.warn('Server TTS announce failed:', e);
  }



// ---- Cebuano audio sprite ----
const audioExt = (new Audio()).canPlayType('audio/mpeg') ? 'mp3' : 'm4a';
const CEB_BASE = '/audio/ceb';

const cebClips = {
  phrases: {
    analysis_complete: `${CEB_BASE}/phrases/analysis_complete.${audioExt}`,
    detected:          `${CEB_BASE}/phrases/detected.${audioExt}`,
    with:              `${CEB_BASE}/phrases/with.${audioExt}`,
    percent_conf:      `${CEB_BASE}/phrases/percent_conf.${audioExt}`,
    no_objects:        `${CEB_BASE}/phrases/no_objects.${audioExt}`,
  },
  labels: {
    person: `${CEB_BASE}/labels/person.${audioExt}`,
    door:   `${CEB_BASE}/labels/door.${audioExt}`,
    stairs: `${CEB_BASE}/labels/stairs.${audioExt}`,
    // add more labels if your model has them
  }
};

const cebNum = n => {
  const r = Math.max(0, Math.min(100, Math.round(n / 5) * 5)); // round to nearest 5
  return `${CEB_BASE}/numbers/${r}.${audioExt}`;
};

function playSeq(paths, { volume = 1.0 } = {}) {
  return new Promise(resolve => {
    let i = 0;
    const next = () => {
      if (i >= paths.length) return resolve();
      const a = new Audio(paths[i++]);
      a.volume = volume;
      a.addEventListener('ended', next, { once: true });
      a.play().catch(() => resolve()); // don’t hang if blocked
    };
    next();
  });
}

// Try to speak in Cebuano; returns true if handled, else false so you can fall back.
async function speakCebuanoDetection(dets) {
  const lang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 'en';
  if (lang !== 'ceb') return false;

  // no objects
  if (!dets || !dets.length) {
    await playSeq([cebClips.phrases.analysis_complete, cebClips.phrases.no_objects]);
    return true;
  }

  // top object
  const top = [...dets].sort((a,b) => (b.conf||0) - (a.conf||0))[0];
  const pct = Math.round((top.conf || 0) * 100);
  const labelKey = (String(top.label || '').toLowerCase());
  const labelPath = cebClips.labels[labelKey];

  // If you haven’t recorded phrases/numbers yet, do a minimal announce:
  if (!labelPath || !cebClips.phrases.detected) {
    await playSeq([labelPath].filter(Boolean));  // just the label clip
    return true;
  }

  // Full sentence: “Analysis complete. Detected <label> with <NN> percent confidence.”
  await playSeq([
    cebClips.phrases.analysis_complete,
    cebClips.phrases.detected,
    labelPath,
    cebClips.phrases.with,
    cebNum(pct),
    cebClips.phrases.percent_conf
  ]);
  return true;
}

// (optional) Preload to avoid first-play delay
(function preloadCebuano(){
  const all = [
    ...Object.values(cebClips.phrases),
    ...Object.values(cebClips.labels),
    ...Array.from({length:21}, (_,i)=>cebNum(i*5))
  ];
  all.forEach(p => { const a = new Audio(p); a.preload = 'auto'; });
})();


  
// ---------- SERVER TTS announce (single block) ----------
const TTS_BASE = ML_BACKEND; // '' if same host

// Warm audio once after any user gesture (unlocks autoplay on WebView)
(function warmBackendsOnce() {
  const run = async () => {
    // Wake health (ok lang kahit mag-502 minsan)
    try { await fetch(`${ML_BACKEND}/health`, { cache: 'no-store' }); } catch {}
    // Small TTS ping to spin up gTTS + network
    try { await fetch(`${TTS_BASE}/api/tts?text=ok&lang=en&_=${Date.now()}`, { cache: 'no-store' }); } catch {}
  };
  ['startCameraBtn','uploadBtn','captureBtn'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', run, { once:true })
  );
})();

function speakLocal(text, lang) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = (lang === 'tl') ? 'fil-PH' : 'en-US'; // simple map
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) { console.warn('Local TTS failed:', e); }
}

async function speakServer(text) {
  const sel  = document.getElementById('languageSelector');
  const lang = (sel?.value === 'tl') ? 'tl' : 'en';

  try {
    const url  = `${TTS_BASE}/api/tts?text=${encodeURIComponent(text)}&lang=${lang}&_=${Date.now()}`;
    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob  = await res.blob();
    const audio = document.getElementById('ttsAudio');
    if (audio.src && audio.src.startsWith('blob:')) { try { URL.revokeObjectURL(audio.src); } catch {} }
    audio.src = URL.createObjectURL(blob);
    await audio.play();  // if blocked, the catch below will trigger
  } catch (e) {
    console.warn('Server TTS failed (falling back to client):', e);
    speakLocal(text, lang);
  }
}


async function dataURLtoBlob(dataURL) {
  const r = await fetch(dataURL);
  return await r.blob();
}

// ---------- Upload flow ----------
// Upload button click handler
if (uploadBtn && fileInput) {
  console.log('📤 Upload button listener attached');
  uploadBtn.addEventListener('click', () => {
    console.log('🖱️ Upload button clicked!');
    // Stop camera when switching to upload
    stopCamera();
    fileInput.click();
  });
}

// Helper function to stop camera
function stopCamera() {
  if (activeStream) {
    console.log('🛑 Stopping camera stream');
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
  }
  if (videoEl) {
    videoEl.srcObject = null;
    videoEl.style.display = 'none';
  }
  if (captureBtn) {
    captureBtn.style.display = 'none';
  }
  if (startCamBtn) {
    startCamBtn.style.display = 'inline-flex';
  }
}

if (fileInput) {
  console.log('📁 File input listener attached');
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    console.log('📂 File selected:', f.name, f.size, 'bytes');
    
    // Clear previous results
    if (resultImg) {
      resultImg.style.display = 'none';
      resultImg.src = '';
    }
    if (resultPlaceholder) resultPlaceholder.style.display = 'block';
    if (detectionCount) detectionCount.style.display = 'none';
    if (resultList) {
      resultList.innerHTML = '';
      if (resultList.parentElement) resultList.parentElement.style.display = 'none';
    }
    if (resultBox) resultBox.classList.remove('result-active');
    
    // Show preview
    if (imageEl) {
      imageEl.src = URL.createObjectURL(f);
      imageEl.style.display = 'block';
    }
    if (previewPlaceholder) previewPlaceholder.style.display = 'none';
    if (previewBox) previewBox.classList.add('active');
    
    // hide video if running
    if (videoEl) videoEl.style.display = 'none';
    
    try { await postToDetectFromBlob(f); }
    catch (e) { 
      console.error('❌ Analysis failed:', e);
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      alert(t('failedToAnalyze') + '\n' + (e.message || e));
    }
  });
}

// ---------- Camera start ----------
async function startCamera() {
  console.log('📷 Starting camera...');
  // Stop any existing stream first
  stopCamera();
  
  // Clear previous results
  if (resultImg) {
    resultImg.style.display = 'none';
    resultImg.src = '';
  }
  if (resultPlaceholder) resultPlaceholder.style.display = 'block';
  if (detectionCount) detectionCount.style.display = 'none';
  if (resultList) {
    resultList.innerHTML = '';
    if (resultList.parentElement) resultList.parentElement.style.display = 'none';
  }
  if (resultBox) resultBox.classList.remove('result-active');
  if (imageEl) imageEl.style.display = 'none';
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    activeStream = stream;
    console.log('✅ Camera stream obtained');
    if (videoEl) {
      videoEl.srcObject = stream;
      videoEl.style.display = 'block';
      console.log('✅ Video element srcObject set');
      if (previewPlaceholder) previewPlaceholder.style.display = 'none';
      if (previewBox) previewBox.classList.add('active');
      // Show capture button, hide start button
      if (captureBtn) {
        captureBtn.style.display = 'inline-flex';
        console.log('✅ Capture button shown');
      }
      if (startCamBtn) startCamBtn.style.display = 'none';
    }
  } catch (e) {
    console.error('❌ Camera error:', e);
    alert(t('cannotAccessCamera') + '\n' + (e.message || e));
  }
}

if (startCamBtn) {
  console.log('🎥 Camera button listener attached');
  startCamBtn.addEventListener('click', () => {
    console.log('🖱️ Camera button clicked!');
    startCamera();
  });
} else {
  console.warn('⚠️ startCameraBtn not found');
}

if (videoEl && !startCamBtn) {
  console.log('🎥 Auto-starting camera (no button found)');
  startCamera();
}

if (startCamBtn) {
  console.log('🎥 Camera button listener attached');
  startCamBtn.addEventListener('click', () => {
    console.log('🖱️ Camera button clicked!');
    startCamera();
  });
} else {
  console.warn('⚠️ startCameraBtn not found');
}

if (videoEl && !startCamBtn) {
  console.log('🎥 Auto-starting camera (no button found)');
  startCamera();
}

// ---------- Capture from camera ----------
if (captureBtn && videoEl) {
  console.log('📸 Capture button listener attached');
  captureBtn.addEventListener('click', async () => {
    console.log('🖱️ Capture button clicked!');
    if (!videoEl.videoWidth) {
      console.warn('⚠️ Video not ready, width:', videoEl.videoWidth);
      return alert(t('cameraNotReady'));
    }
    console.log('📸 Capturing frame, size:', videoEl.videoWidth, 'x', videoEl.videoHeight);
    hiddenCanvas.width = videoEl.videoWidth;
    hiddenCanvas.height = videoEl.videoHeight;
    hiddenCanvas.getContext('2d').drawImage(videoEl, 0, 0);
    const blob = await new Promise(r => hiddenCanvas.toBlob(r, 'image/jpeg', 0.92));
    console.log('✅ Frame captured, blob size:', blob.size);
    
    // Show preview
    if (imageEl) {
      imageEl.src = hiddenCanvas.toDataURL('image/jpeg', 0.92);
      imageEl.style.display = 'block';
    }
    // Hide video
    if (videoEl) videoEl.style.display = 'none';
    
    // Stop camera after capture
    stopCamera();
    
    try { await postToDetectFromBlob(blob); }
    catch (e) { 
      console.error('❌ Analysis failed:', e);
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      alert(t('failedToAnalyze') + '\n' + (e.message || e));
    }
  });
}

// ---------- Explicit Analyze button ----------
if (analyzeBtn) {
  console.log('🔍 Analyze button listener attached');
  analyzeBtn.addEventListener('click', async () => {
    console.log('🖱️ Analyze button clicked!');
    try {
      // 1) prefer file input
      if (fileInput?.files?.[0]) {
        console.log('📂 Using file input');
        await postToDetectFromBlob(fileInput.files[0]);
        return;
      }
      // 2) else use preview image (dataURL) if available
      if (imageEl?.src?.startsWith('data:')) {
        console.log('🖼️ Using preview image data URL');
        const blob = await dataURLtoBlob(imageEl.src);
        await postToDetectFromBlob(blob);
        return;
      }
      // 3) else capture current video frame
      if (videoEl?.videoWidth) {
        console.log('📹 Capturing current video frame');
        hiddenCanvas.width = videoEl.videoWidth;
        hiddenCanvas.height = videoEl.videoHeight;
        hiddenCanvas.getContext('2d').drawImage(videoEl, 0, 0);
        const blob = await new Promise(r => hiddenCanvas.toBlob(r, 'image/jpeg', 0.92));
        await postToDetectFromBlob(blob);
        return;
      }
      console.warn('⚠️ No image source available');
      alert(t('noImageToAnalyze'));
    } catch (e) {
      console.error('❌ Analysis failed:', e);
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      alert(t('failedToAnalyze') + '\n' + (e.message || e));
    }
  });
}


console.log('✅ script.js initialization complete');

