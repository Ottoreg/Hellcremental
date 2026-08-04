/* =========================================================================
 * Hellcremental — Service Worker (PWA)
 * Met en cache la coquille de l'application pour un fonctionnement HORS-LIGNE
 * et une installation sur l'écran d'accueil (mobile & bureau).
 * ========================================================================= */

// Version du cache : à INCRÉMENTER à chaque déploiement pour forcer la mise à
// jour des applications déjà installées (l'ancien cache est purgé à l'activation).
const CACHE = 'hellcremental-v7';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/music.js',
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

// Requêtes : « stale-while-revalidate » — on sert le cache immédiatement (rapide,
// hors-ligne) MAIS on rafraîchit toujours depuis le réseau en arrière-plan, de
// sorte que les mises à jour du jeu se propagent d'un lancement à l'autre (fini
// la version figée des applications installées).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
