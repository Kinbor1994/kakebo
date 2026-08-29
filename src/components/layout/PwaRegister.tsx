'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA ServiceWorker registered successfully with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('PWA ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
