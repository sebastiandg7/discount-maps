'use client';

import { useEffect } from 'react';

/** Registers /sw.js once the page has loaded (offline fallback + PWA install). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((error) => console.warn('[sw] registration failed', error));
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
