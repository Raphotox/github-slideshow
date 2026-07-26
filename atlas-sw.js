/* Service worker Atlas — coquille applicative hors ligne.
   Stratégie : stale-while-revalidate sur la coquille (l'app démarre
   instantanément depuis le cache, la mise à jour se télécharge en fond
   et sera servie au lancement suivant). Les appels de données
   (OWID, NASA, USGS…) sont cross-origin et ne sont pas interceptés :
   chaque module de l'app gère déjà ses propres caches et états hors ligne. */
'use strict';

const CACHE = 'atlas-shell-v1';
const SHELL = [
  './atlas_MOBILE_v45_petitbac_glace_bilingue.html',
  './atlas.webmanifest',
  './icons/atlas-icon-192.png',
  './icons/atlas-icon-512.png',
  './icons/atlas-icon-maskable-192.png',
  './icons/atlas-icon-maskable-512.png',
  './icons/atlas-apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // données : réseau direct

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request, { ignoreSearch: request.mode === 'navigate' }).then(cached => {
        const refresh = fetch(request)
          .then(response => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    )
  );
});
