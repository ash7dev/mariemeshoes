'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker (page « Pas de connexion » quand le réseau tombe).
 * En production seulement : en développement, il gênerait le rechargement à chaud.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((error) => {
      console.error('Service worker non enregistré', error);
    });
  }, []);
  return null;
}
