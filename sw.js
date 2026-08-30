// Service worker Hasu Protect — la doc reste consultable hors-ligne.
// Stratégies : la PAGE en réseau-d'abord (le bot la régénère souvent → jamais de version périmée en ligne,
// repli sur le cache seulement hors connexion) ; les ressources stables (icônes, manifest) en cache-d'abord
// AVEC revalidation en arrière-plan ; tout le live (heartbeat, stats, uptime, compteurs Abacus, API GitHub)
// passe DIRECT au réseau, jamais caché.
// Fichier séparé du template du bot : ses « maj site » ne le touchent pas.
//
// v3 (correctifs hors-ligne) — les quatre défauts corrigés, reproduits puis prouvés par .github/unit-tests.js :
//  1. Le repli hors-ligne ignorait le cache dès que l'URL portait un paramètre. Or le site en ajoute
//     lui-même (syncURL : ?q=…&cat=…&acc=…&lang=…, posés par replaceState — donc JAMAIS mis en cache,
//     puisque replaceState ne déclenche aucune requête). Résultat : recharger hors-ligne après avoir
//     filtré ou changé de langue ne trouvait rien. → caches.match(..., {ignoreSearch:true}).
//  2. Ce repli rendait `undefined` quand le cache était vide, et respondWith(undefined) affiche l'erreur
//     réseau BRUTE du navigateur. → repli en cascade : URL exacte → même URL sans paramètres → coquille
//     du site (./ , index.html) → page « hors ligne » minimale bilingue. Toujours une Response.
//  3. Les réponses NON-OK étaient mises en cache : un 404 passager sur une icône restait servi
//     indéfiniment par la branche cache-d'abord. → on ne met en cache que r.ok.
//  4. La branche cache-d'abord n'avait ni expiration ni revalidation. → stale-while-revalidate : le
//     cache répond tout de suite, une requête de fond rafraîchit l'entrée pour la visite suivante.
// Le nom du cache passe à v3 : `activate` purge v2, qui peut contenir des réponses non-OK empoisonnées.
const CACHE = 'hasu-docs-v3';
const STATIC = ['assets/icon-192.png', 'assets/icon-512.png', 'favicon.svg', 'manifest.webmanifest'];

// Page de secours si le visiteur arrive hors-ligne sans RIEN en cache (jamais venu, ou cache purgé).
// Bilingue comme le reste du site : les deux langues sont affichées, aucun JS ne tourne ici.
const OFFLINE_HTML = '<!doctype html><html lang="fr"><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors ligne — Hasu Protect</title>'
  + '<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6rem;'
  + 'font:16px/1.5 system-ui,Segoe UI,Roboto,sans-serif;background:#0f1117;color:#e6e8ee;text-align:center;padding:24px}'
  + 'h1{font-size:1.3rem;margin:0}p{margin:0;color:#9aa2b1}</style>'
  + '<h1>📡 Hors ligne</h1><p>La documentation n’est pas encore enregistrée sur cet appareil.<br>Reconnecte-toi puis recharge la page.</p>'
  + '<p lang="en">The documentation is not stored on this device yet.<br>Reconnect and reload the page.</p></html>';

function offlineResponse() {
  return new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Mise en cache DÉFENSIVE : seulement les réponses réellement bonnes, et jamais de rejet non rattrapé
// (quota dépassé, mode navigation privée → put() rejette).
function cachePut(req, res) {
  if (!res || !res.ok) return; // ← défaut 3 : un 404/500 ne doit jamais entrer dans le cache
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => { });
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Repli hors-ligne d'une navigation : on essaie du plus précis au plus général, et on rend TOUJOURS
// une Response (défaut 2) — jamais `undefined`, qui se traduit par une erreur réseau brute.
function pageFallback(req) {
  return caches.match(req)
    .then((hit) => hit || caches.match(req, { ignoreSearch: true }))  // ← défaut 1 : ?q=…&lang=…
    .then((hit) => hit || caches.match('./', { ignoreSearch: true }))
    .then((hit) => hit || caches.match('index.html', { ignoreSearch: true }))
    .then((hit) => hit || offlineResponse())
    .catch(() => offlineResponse());
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // live externe : réseau direct
  if (/stats\.json|heartbeat/.test(url.pathname)) return; // données live même origine : réseau direct
  const isPage = e.request.mode === 'navigate' || /index\.html$|\/$|history\.html$/.test(url.pathname);
  if (isPage) {
    // réseau d'abord, cache en secours (mode hors-ligne)
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then((r) => {
      cachePut(e.request, r);
      return r;
    }).catch(() => pageFallback(e.request)));
  } else {
    // statique : cache d'abord + revalidation en arrière-plan (stale-while-revalidate, défaut 4).
    // Le cache répond immédiatement ; le réseau rafraîchit l'entrée pour la visite suivante.
    e.respondWith(caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((r) => { cachePut(e.request, r); return r; });
      if (hit) { net.catch(() => { }); return hit; }
      return net;
    }));
  }
});
