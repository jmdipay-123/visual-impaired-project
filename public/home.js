// home.js — passive geolocation saver (no prompt on Home)
document.addEventListener('DOMContentLoaded', async () => {
  if (!('geolocation' in navigator)) {
    console.warn('❌ Geolocation not supported.');
    return;
  }

  try {
    let state = 'prompt';
    if (navigator.permissions?.query) {
      const p = await navigator.permissions.query({ name: 'geolocation' });
      state = p.state; // 'granted' | 'denied' | 'prompt'
    }

    // ✅ Only read and save if already granted; do NOT prompt here
    if (state === 'granted') {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = +pos.coords.latitude.toFixed(6);
          const lon = +pos.coords.longitude.toFixed(6);
          const acc = Math.round(pos.coords.accuracy || 0);

          console.log('✅ Geo granted (Home). Saving coords:', lat, lon, '±', acc, 'm');
          localStorage.setItem('userLocation', JSON.stringify({ lat, lon, acc }));
          window.dispatchEvent(new CustomEvent('locationSaved', { detail: { lat, lon, acc } }));
        },
        (err) => {
          console.warn('⚠️ Reading location failed:', err);
          // Keep old saved location if any; don’t clear on read failure
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      console.log(`ℹ️ Skipping geo prompt on Home (permission: ${state}). Location will be requested on the Location page.`);
    }
  } catch (err) {
    console.warn('⚠️ Permission check failed:', err);
  }
});
