// public/translations.js
const translations = {
  en: {
    // Header
    siteName: "Object Recognition and Navigation",
    home: "Home",
    objectInfo: "Object Information",
    
    // Hero Section
    heroTitle: "Enhancing Object Recognition and Navigation for Visually Impaired Person using Deep Learning Algorithm",
    heroDescription: "Integrating deep-learning object detection to deliver real-time guidance and obstacle alerts for visually impaired users.",
    enableLoc: "Enable Location",
    navLoc: "Location",
    // Feature Cards
    captureTitle: "Capture Image",
    captureDesc: "Use your device camera to capture an object.",
    uploadTitle: "Upload Image",
    uploadDesc: "Upload an image from your gallery for analysis.",
    infoTitle: "Object Information",
    infoDesc: "Learn more about Object Recognition and Navigation and their impact.",
    
    // Detection Section
    detectTitle: "Detect Objects",
    detectInstructions: "Select or capture an image for object detection:",
    useCamera: "Use Camera",
    uploadImage: "Upload Image",
    capturePhoto: "Capture Photo",
    analyzeImage: "Analyze Image",
    
    // Image Boxes
    originalImage: "Original Image",
    detectionResult: "Detection Result",
    noImageSelected: "No image selected",
    resultWillAppear: "Analysis result will appear here",
    
    // Loading
    analyzing: "Analyzing Image...",
    mayTakeTime: "This may take 5-15 seconds",
    
    // Results
    detectedObjects: "Detected Objects",
    objects: "objects",
    object: "object",
    confidence: "confidence",
    noObjectsDetected: "No objects detected in this image",
    
    // Errors
    cameraNotReady: "Camera not ready yet.",
    cannotAccessCamera: "Cannot access camera.",
    failedToAnalyze: "Failed to analyze image.",
    noImageToAnalyze: "No image to analyze. Upload a photo or start the camera.",
    tooManyRequests: "Too many requests. Please try again later.",
    
    // Footer
    copyright: "© 2025 Object Recognition and Navigation. All rights reserved.",
    
    // Voice announcements
    voiceDetected: "Detected",
    voiceWith: "with",
    voiceConfidence: "confidence",
    voiceNoObjects: "No objects detected in this image",
    voiceAnalysisComplete: "Analysis complete",

    // Information objects
    objectInformationTitle: "Object Information",
    objectPeopleTitle: "People",
    objectPeopleDesc: "The camera automatically detects and identifies people in real time.",
    objectDoorsTitle: "Doors",
    objectDoorsDesc: "The system recognizes doors and helps indicate their location and orientation.",
    objectStairsTitle: "Stairs",
    objectStairsDesc: "The camera detects stairs to assist with safe navigation and movement.",

    // Location title
    locationTitle: "Your Location Map",
    locationUsingSaved: "Using saved location",

    // voiceannouncements
    voiceResultWithObject: "Analysis complete. Detected {label} with {confidence} percent confidence",
    voiceResultNoObject: "Analysis complete. No objects detected in this image"

  },
  
  tl: { // Tagalog
    // Header
    siteName: "Pagkilala ng Bagay at Nabigasyon",
    home: "Tahanan",
    objectInfo: "Impormasyon ng Bagay",
    navLoc: "Lokasyon",
    
    // Hero Section
    heroTitle: "Pagpapahusay ng Pagkilala ng Bagay at Nabigasyon para sa Taong may Kapansanan sa Paningin gamit ang Deep Learning Algorithm",
    heroDescription: "Pagsasama ng deep-learning object detection upang magbigay ng real-time na gabay at babala sa sagabal para sa mga gumagamit na may kapansanan sa paningin.",
    enableLoc: "Paganahin ang Lokasyon",
    // Feature Cards
    captureTitle: "Kunan ng Larawan",
    captureDesc: "Gamitin ang camera ng iyong device upang kunan ang isang bagay.",
    uploadTitle: "Mag-upload ng Larawan",
    uploadDesc: "Mag-upload ng larawan mula sa iyong gallery para sa pagsusuri.",
    infoTitle: "Impormasyon ng Bagay",
    infoDesc: "Matuto pa tungkol sa Pagkilala ng Bagay at Nabigasyon at ang kanilang epekto.",
    
    // Detection Section
    detectTitle: "Tuklasin ang mga Bagay",
    detectInstructions: "Pumili o kumuha ng larawan para sa pagkilala ng bagay:",
    useCamera: "Gamitin ang Camera",
    uploadImage: "Mag-upload ng Larawan",
    capturePhoto: "Kunan ng Litrato",
    analyzeImage: "Suriin ang Larawan",
    
    // Image Boxes
    originalImage: "Orihinal na Larawan",
    detectionResult: "Resulta ng Pagtuklas",
    noImageSelected: "Walang napiling larawan",
    resultWillAppear: "Ang resulta ng pagsusuri ay lalabas dito",
    
    // Loading
    analyzing: "Sinusuri ang Larawan...",
    mayTakeTime: "Maaaring tumagal ng 5-15 segundo",
    
    // Results
    detectedObjects: "Natuklasang mga Bagay",
    objects: "mga bagay",
    object: "bagay",
    confidence: "tiwala",
    noObjectsDetected: "Walang natuklasang bagay sa larawang ito",
    
    // Errors
    cameraNotReady: "Ang camera ay hindi pa handa.",
    cannotAccessCamera: "Hindi ma-access ang camera.",
    failedToAnalyze: "Nabigo ang pagsusuri ng larawan.",
    noImageToAnalyze: "Walang larawan na susuriin. Mag-upload ng litrato o simulan ang camera.",
    tooManyRequests: "Masyadong maraming kahilingan. Pakisubukan ulit mamaya.",

     // location title
    locationTitle: "Iyong Lokasyon sa Mapa",
    locationUsingSaved: "Gamit ang naka-save na lokasyon",

    // Information objects
    objectInformationTitle: "Impormasyon ng Bagay",
    objectPeopleTitle: "Tao",
    objectPeopleDesc: "Awtomatikong natutukoy at nakikilala ng camera ang mga tao sa real time.",
    objectDoorsTitle: "Mga Pinto",
    objectDoorsDesc: "Nakikilala ng sistema ang mga pinto at tinutukoy ang kanilang lokasyon at posisyon.",
    objectStairsTitle: "Hagdan",
    objectStairsDesc: "Natutukoy ng camera ang mga hagdan upang matulungan sa ligtas na paggalaw at nabigasyon.",

     // voiceannouncements
    voiceResultWithObject: "Tapos na ang pagsusuri. Nadetect ang {label} na may {confidence} porsyentong katiyakan",
    voiceResultNoObject: "Tapos na ang pagsusuri. Walang nadetect na bagay sa larawang ito",
    
    // Footer
    copyright: "© 2025 Pagkilala ng Bagay at Nabigasyon. Lahat ng karapatan ay nakalaan."

  },
  
  ceb: { // Cebuano
    // Header
    siteName: "Pag-ila sa Butang ug Nabigasyon",
    home: "Balay",
    objectInfo: "Impormasyong Butang",
    navLoc: "Lokasyon",
    
    // Hero Section
    heroTitle: "Pagpauswag sa Pag-ila sa Butang ug Nabigasyon alang sa Tawo nga Adunay Kakulangan sa Panan-aw gamit ang Deep Learning Algorithm",
    heroDescription: "Paghiusa sa deep-learning object detection aron makahatag og real-time nga giya ug pasidaan sa mga babag alang sa mga tiggamit nga adunay kakulangan sa panan-aw.",
    enableLoc: "I-enable ang Lokasyon",
    // Feature Cards
    captureTitle: "Kuhaa ang Hulagway",
    captureDesc: "Gamita ang camera sa imong device aron kuhaan ang usa ka butang.",
    uploadTitle: "Pag-upload og Hulagway",
    uploadDesc: "Pag-upload og hulagway gikan sa imong gallery alang sa pagsusi.",
    infoTitle: "Impormasyon sa Butang",
    infoDesc: "Tun-i pa bahin sa Pag-ila sa Butang ug Nabigasyon ug ang ilang epekto.",
    
    // Detection Section
    detectTitle: "Pangitaa ang mga Butang",
    detectInstructions: "Pilia o kuhaa ang hulagway alang sa pag-ila sa butang:",
    useCamera: "Gamita ang Camera",
    uploadImage: "Pag-upload og Hulagway",
    capturePhoto: "Kuhaa ang Litrato",
    analyzeImage: "Susiha ang Hulagway",
    
    // Image Boxes
    originalImage: "Orihinal nga Hulagway",
    detectionResult: "Resulta sa Pagpangita",
    noImageSelected: "Walay napiling hulagway",
    resultWillAppear: "Ang resulta sa pagsusi mogawas dinhi",
    
    // Loading
    analyzing: "Gisusihay ang Hulagway...",
    mayTakeTime: "Mahimong molungtad og 5-15 ka segundo",
    
    // Results
    detectedObjects: "Nakit-ang mga Butang",
    objects: "mga butang",
    object: "butang",
    confidence: "kasigurohan",
    noObjectsDetected: "Walay nakit-ang butang sa kini nga hulagway",
    
    // Errors
    cameraNotReady: "Ang camera wala pa andam.",
    cannotAccessCamera: "Dili ma-access ang camera.",
    failedToAnalyze: "Napakyas ang pagsusi sa hulagway.",
    noImageToAnalyze: "Walay hulagway nga susiha. Pag-upload og litrato o sugdi ang camera.",
    tooManyRequests: "Daghan kaayong mga hangyo. Palihug sulayi pag-usab sa ulahi.",

    // location title
    locationTitle: "Imong Lokasyon sa Mapa",
    locationUsingSaved: "Gigamit ang naluwas nga lokasyon (±73 m).",

    // Information objects
    objectInformationTitle: "Impormasyon sa Butang",
    objectPeopleTitle: "Tawo",
    objectPeopleDesc: "Awtomatikong makit-an ug maila sa kamera ang mga tawo sa real time.",
    objectDoorsTitle: "Mga Pultahan",
    objectDoorsDesc: "Makaila ang sistema sa mga pultahan ug magpakita sa ilang lokasyon ug direksyon.",
    objectStairsTitle: "Hagdanan",
    objectStairsDesc: "Makita sa kamera ang mga hagdanan aron matabangan ka sa luwas nga paglihok ug nabigasyon.",


    // Footer
    copyright: "© 2025 Pag-ila sa Butang ug Nabigasyon. Tanang katungod gitagana.",

    // announcements
    voiceResultWithObject: "Nahuman na ang pagsusi. Nakit-an ang {label} nga adunay {confidence} porsyento nga kasigurohan",
    voiceResultNoObject: "Nahuman na ang pagsusi. Walay nakit-ang butang sa imahe"
  }
};

(function () {
  const STORAGE_KEY = 'lang';

  function getLang() {
    try { return localStorage.getItem(STORAGE_KEY) || 'en'; } catch { return 'en'; }
  }
  function setLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }
  function t(key, fallback = '') {
    const lang = getLang();
    return (translations[lang] && translations[lang][key]) || fallback;
  }

  function applyTranslations() {
    const lang = getLang();
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      const val = translations[lang]?.[k];
      if (!val) return;
      if (el.hasAttribute('placeholder')) el.placeholder = val;
      else el.textContent = val;
    });

    const sel = document.getElementById('languageSelector');
    if (sel && sel.value !== lang) sel.value = lang;
  }

  function refreshMapIfAny() {
    const iframe = document.getElementById('gmIframe');
    if (!iframe) return;
    const coordsText = document.getElementById('gmCoords')?.textContent || '';
    const [lat, lon] = coordsText.split(',').map(s => s?.trim());
    const hl = (getLang() === 'tl') ? 'fil' : 'en';
    if (lat && lon) {
      iframe.src = `https://www.google.com/maps?q=${lat},${lon}&z=16&hl=${hl}&output=embed`;
    } else if (typeof window.autoAskAndEmbed === 'function') {
      window.autoAskAndEmbed();
    }
  }

  // expose for other scripts (TTS builder, etc.)
  window.getCurrentLanguage = getLang;
  window.setLanguage = (lang) => { setLang(lang); applyTranslations(); refreshMapIfAny(); };
  window.t = t;
  window.applyTranslations = applyTranslations;

  document.addEventListener('DOMContentLoaded', () => {
    // initial apply
    applyTranslations();
    refreshMapIfAny();

    // selector binding
    const sel = document.getElementById('languageSelector');
    if (sel) {
      sel.value = getLang();
      sel.addEventListener('change', e => {
        setLanguage(e.target.value);
      });
    }
  });
})();