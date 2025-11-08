// Helpers
  function setStatus(msg){ const el = document.getElementById('mapStatus'); if (el) el.textContent = msg || ''; }
  function setCoords(lat, lon){ const el = document.getElementById('gmCoords'); if (el) el.textContent = (lat && lon) ? `${lat}, ${lon}` : '--'; }
  function mapsLangParam() {
    const sel = document.getElementById('languageSelector');
    const v = (sel && sel.value) ? sel.value : 'en';
    // Google Maps web UI supports 'en' and 'fil' (walang 'ceb'), kaya ceb -> en
    return (v === 'tl') ? 'fil' : 'en';
  }
  function embedMap(lat, lon, acc) {
    const iframe = document.getElementById('gmIframe');
    const hl = mapsLangParam();
    iframe.src = `https://www.google.com/maps?q=${lat},${lon}&z=16&hl=${hl}&output=embed`;
    iframe.style.display = 'block';
    setStatus(`Embedded at your location (±${acc} m).`);
  }

  // Core geolocation (will trigger permission prompt)
  function requestLocationOnce() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported.'));
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = +pos.coords.latitude.toFixed(6);
          const lon = +pos.coords.longitude.toFixed(6);
          const acc = Math.round(pos.coords.accuracy || 0);
          resolve({ lat, lon, acc });
        },
        err => reject(err),
        { enableHighAccuracy:true, timeout:10000, maximumAge:5000 }
      );
    });
  }

async function autoAskAndEmbed() {
  const saved = localStorage.getItem('userLocation');

  // 1️⃣ Use saved location if available
  if (saved) {
    try {
      const { lat, lon, acc } = JSON.parse(saved);
      setCoords(lat, lon);
      embedMap(lat, lon, acc);
      setStatus(`Using saved location (±${acc} m).`);
      return; // ✅ done, no need to ask
    } catch (err) {
      console.warn('Failed to parse saved location:', err);
      localStorage.removeItem('userLocation'); // clear corrupted data
    }
  }

  // 2️⃣ Require HTTPS (or localhost)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    setStatus('Geolocation requires HTTPS (or localhost).');
    return;
  }

  // 3️⃣ Use Permissions API for nicer UX
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const p = await navigator.permissions.query({ name: 'geolocation' });
      if (p.state === 'granted') {
        const { lat, lon, acc } = await requestLocationOnce();
        setCoords(lat, lon);
        embedMap(lat, lon, acc);
        localStorage.setItem('userLocation', JSON.stringify({ lat, lon, acc }));
        return;
      }
      if (p.state === 'denied') {
        setStatus('Location permission is blocked. Enable it in your browser settings.');
        document.getElementById('enableLocationBtn').style.display = 'inline-block';
        localStorage.removeItem('userLocation'); // clear any old location
        return;
      }
      // p.state === 'prompt' → proceed to immediate request
    }
  } catch (_) { /* ignore */ }

  // 4️⃣ Aggressive prompt if no saved location
  try {
    setStatus('Asking for your location…');
    const { lat, lon, acc } = await requestLocationOnce();
    setCoords(lat, lon);
    embedMap(lat, lon, acc);
    localStorage.setItem('userLocation', JSON.stringify({ lat, lon, acc }));
  } catch (e) {
    console.warn('Geo error:', e);
    const btn = document.getElementById('enableLocationBtn');
    if (btn) btn.style.display = 'inline-block';
    if (e && e.code === 1) setStatus('Permission denied by user.');
    else if (e && e.code === 2) setStatus('Position unavailable.');
    else if (e && e.code === 3) setStatus('Location request timed out.');
    else setStatus('Unable to get your location.');
    localStorage.removeItem('userLocation'); // clear any old saved location
  }
}



  // Fallback button if the browser blocked auto-prompt (some Safari/iOS configs)
  document.getElementById('enableLocationBtn')?.addEventListener('click', async () => {
    try {
      setStatus('Requesting location…');
      const { lat, lon, acc } = await requestLocationOnce();
      setCoords(lat, lon);
      embedMap(lat, lon, acc);
      document.getElementById('enableLocationBtn').style.display = 'none';
    } catch (e) {
      console.warn('Geo error:', e);
      if (e && e.code === 1) setStatus('Permission denied. Please allow location.');
      else if (e && e.code === 2) setStatus('Position unavailable.');
      else if (e && e.code === 3) setStatus('Timeout. Try again.');
      else setStatus('Unable to get your location.');
    }
  });


// On page load — use saved location from home page
document.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('userLocation');
  const iframe = document.getElementById('gmIframe');

  // Check permission before showing saved map
  let permission = 'prompt';
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const p = await navigator.permissions.query({ name: 'geolocation' });
      permission = p.state;
    }
  } catch (_) { /* ignore */ }

  if (permission === 'denied') {
    // 🚫 Don't use saved location if user blocked permission
    localStorage.removeItem('userLocation');
    if (iframe) iframe.style.display = 'none';
    setCoords('--', '--');
    setStatus('Location access is blocked. Please allow location access.');
    document.getElementById('enableLocationBtn').style.display = 'inline-block';
    return;
  }

  if (saved && permission === 'granted') {
    try {
      const { lat, lon, acc } = JSON.parse(saved);
      setCoords(lat, lon);
      embedMap(lat, lon, acc);
      setStatus(`Using saved location (±${acc} m).`);
    } catch (err) {
      console.warn('Failed to parse saved location:', err);
      setStatus('Unable to read saved location data.');
    }
  } else {
    setStatus('Location not yet available. Please enable it from the home page.');
    const btn = document.getElementById('enableLocationBtn');
    if (btn) btn.style.display = 'inline-block';
  }
});




  // Optional: kapag nagpalit ng language sa dropdown, i-refresh lang ang iframe para magbago ang map labels
  document.getElementById('languageSelector')?.addEventListener('change', () => {
    const iframe = document.getElementById('gmIframe');
    if (!iframe || !iframe.src) return;
    const [lat, lon] = (document.getElementById('gmCoords')?.textContent || '').split(',').map(s=>s?.trim());
    if (lat && lon) {
      const hl = mapsLangParam();
      iframe.src = `https://www.google.com/maps?q=${lat},${lon}&z=16&hl=${hl}&output=embed`;
    }
  });