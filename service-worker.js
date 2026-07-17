/* =========================================================================
 * Hellcremental — Service Worker (PWA)
 * Met en cache la coquille de l'application pour un fonctionnement HORS-LIGNE
 * et une installation sur l'écran d'accueil (mobile & bureau).
 * ========================================================================= */

const CACHE = 'hellcremental-v2';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/rng.js',
  './js/iso.js',
  './js/game.js',
  './js/ui.js',
  './js/main.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

// Installation : pré-cache la coquille.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activation : nettoie les anciens caches.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Requêtes : cache d'abord, réseau en repli (avec mise en cache à la volée).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
