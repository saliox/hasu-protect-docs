// Service worker Hasu Protect — la doc reste consultable hors-ligne.
// Stratégies : la PAGE en réseau-d'abord (le bot la régénère souvent → jamais de version périmée en ligne,
// repli sur le cache seulement hors connexion) ; les ressources stables (icônes, manifest) en cache-d'abord ;
// tout le live (heartbeat, stats, uptime, compteurs Abacus, API GitHub) passe DIRECT au réseau, jamais caché.
// Fichier séparé du template du bot : ses « maj site » ne le touchent pas.
const CACHE = 'hasu-docs-v2';
const STATIC = ['assets/icon-192.png', 'assets/icon-512.png', 'favicon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // live externe : réseau direct
  if (/stats\.json|heartbeat/.test(url.pathname)) return; // données live même origine : réseau direct
  const isPage = e.request.mode === 'navigate' || /index\.html$|\/$|history\.html$/.test(url.pathname);
  if (isPage) {
    // réseau d'abord, cache en secours (mode hors-ligne)
    e.respondWith(fetch(e.request).then((r) => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request)));
  } else {
    // statique : cache d'abord, réseau en secours (et mise en cache au passage, jamais si réponse KO)
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return r;
    })));
  }
});
