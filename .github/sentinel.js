// Sentinelle anti-écrasement : le déploiement auto du bot (« état local = référence ») a déjà
// écrasé deux fois (23/07 et 07/08) les correctifs fusionnés sur main. Ce script vérifie que
// chaque bloc greffé (sections de .github/SYNC-BOT.md) est toujours présent dans index.html,
// et que les fichiers annexes (PWA, bannière) existent. S'il manque quelque chose, il liste
// précisément les sections écrasées et échoue → croix rouge sur le commit + mail GitHub.
// Lancé par .github/workflows/sentinel.yml à chaque push sur main.
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// ── Zones de recherche.
// Audit 30/08 : trois marqueurs « CSP » n'étaient PAS SCOPÉS. « https://raw.githubusercontent.com »
// surveillait le connect-src… mais la même chaîne apparaît 5 fois ailleurs dans la page (__upURL,
// liens). Supprimer l'hôte de la CSP laissait donc la sentinelle VERTE alors que le heartbeat ne
// pouvait plus être lu. Idem pour abacus (4 occurrences) et top.gg (5). Un marqueur qui surveille
// une directive doit être cherché DANS cette directive, pas n'importe où dans le fichier.
const CSP = (() => {
  const tag = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  if (!tag) return {};
  const c = tag[0].match(/content="([^"]*)"/i) || tag[0].match(/content='([^']*)'/i);
  if (!c) return {};
  const out = {};
  for (const part of c[1].split(';')) { const t = part.trim(); const sp = t.indexOf(' '); if (sp > 0) out[t.slice(0, sp).toLowerCase()] = t.slice(sp + 1); }
  return out;
})();

// zone === undefined  → tout index.html
// zone === 'csp:<directive>' → uniquement la valeur de cette directive de la meta CSP
function present(needle, zone) {
  if (!zone) return html.includes(needle);
  const d = zone.slice(4);
  return (CSP[d] || '').includes(needle);
}

// Un marqueur par bloc : chaîne introduite par nos correctifs, absente du vieux template du bot.
// (§n = section de SYNC-BOT.md à recopier dans le template local pour réparer.)
const MARKERS = [
  ['§1 CSP — connect-src raw.githubusercontent (heartbeat)', 'https://raw.githubusercontent.com', 'csp:connect-src'],
  ['§6 CSP — connect-src abacus (compteurs visites/votes)', 'https://abacus.jasoncameron.dev', 'csp:connect-src'],
  ['§2 Badge de statut — logique 3 zones', '__exactUntil'],
  ['§3 Parseur de paramètres — splitTop', 'splitTop'],
  ['§4 Panneau Guardian — précision décimale', 'Précision réelle'],
  ['§6 Compteur de visites global (gvisits)', 'gvisits'],
  ['§7 Recatégorisation des 6 commandes (MOVES)', 'MOVES'],
  ['§8 Perf — content-visibility sur les cartes', 'content-visibility'],
  ['§9 Disponibilité 7 jours (renderUp)', 'renderUp'],
  ['§10 Historique à la demande (loadHist)', 'loadHist'],
  ['§11 Lot UX — vote utile (m-vote)', 'm-vote'],
  ['§11 Lot UX — filtres flottants mobile (fsheet)', 'fsheet'],
  ['§12 Lot découverte — favoris (favCmds)', 'favCmds'],
  ['§12 Lot découverte — palette Ctrl+K (kOpen)', 'kOpen'],
  ['§12 PWA — <link rel="manifest">', 'rel="manifest"'],
  ['§12 PWA — worker-src \'self\' dans la CSP', "'self'", 'csp:worker-src'],
  ['§12 PWA — enregistrement du service worker', 'serviceWorker'],
  ['§13 Lot polish — chips de filtres actifs (achips)', 'achips'],
  ['§13 Lot polish — mini-tour de bienvenue (tourDone)', 'tourDone'],
  ['§14 Analytics — bannière de partage og-banner', 'og-banner.jpg'],
  ['§14 Analytics — panneau Réseau (renderNet)', 'renderNet'],
  ['§15 Nouveautés v2 — garde anti-bruit (seenAt)', 'seenAt'],
  ['§15 Widget top.gg — badge (topgg-badge)', 'topgg-badge'],
  ['§15 Widget top.gg — img-src https://top.gg dans la CSP', 'https://top.gg', 'csp:img-src'],
  ['§16 Premiers pas v2 — puces cliquables (data-cmd)', 'data-cmd'],
  ['§16 FAQ statique + JSON-LD FAQPage', 'FAQPage'],
  ['§16 Rappel de vote top.gg (votedTgAt)', 'votedTgAt'],
];

// Fichiers annexes que le déploiement du bot ne doit ni supprimer ni omettre.
const FILES = [
  'history.html', // historique scindé (§17) — sans lui, « Voir tout l'historique » échoue
  'manifest.webmanifest',
  'sw.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/og-banner.jpg',
  'CONSIGNES-BOT.md',
  // Le garde qui compare le catalogue du site aux commandes du bot, et ce dont il dépend. Sans le
  // manifeste attesté il ne peut plus rien dire ; sans la campagne de mutation, plus personne ne
  // vérifie qu'il mord. Les trois sont donc surveillés comme le reste — un garde supprimé en
  // silence est exactement le trou qu'il ferme. (Voir .github/check-commands.js pour le détail.)
  '.github/check-commands.js',
  '.github/commands.manifest.json',
  '.github/mutants-commands.js',
  'sitemap.xml',
  'robots.txt',
  '404.html',
];

const missing = MARKERS.filter(([, needle, zone]) => !present(needle, zone));
const gone = FILES.filter((f) => !fs.existsSync(f));

// Équilibre des <div> dans le bloc changelog : un </div> manquant a déjà fait avaler toute la
// page par la boîte dorée (bug du contour, 12/08). On vérifie la zone changelog → quickstart.
const clStart = html.indexOf('<div class="changelog">');
const clEnd = html.indexOf('<div class="quickstart"', clStart);
if (clStart >= 0 && clEnd > clStart) {
  const zone = html.slice(clStart, clEnd);
  const opens = (zone.match(/<div[\s>]/g) || []).length;
  const closes = (zone.match(/<\/div>/g) || []).length;
  if (opens !== closes) {
    console.error('❌ Déséquilibre de <div> dans le bloc changelog : ' + opens + ' ouverts / ' + closes + ' fermés — le contour doré va avaler la page.');
    process.exit(1);
  }
}

if (!missing.length && !gone.length) {
  console.log('✅ Sentinelle : les ' + MARKERS.length + ' blocs greffés et les ' + FILES.length + ' fichiers annexes sont tous présents.');
  process.exit(0);
}

console.error('❌ ÉCRASEMENT DÉTECTÉ — un déploiement a supprimé des correctifs fusionnés sur main.');
if (missing.length) {
  console.error('\nBlocs absents d\'index.html (' + missing.length + '/' + MARKERS.length + ') :');
  for (const [label, needle] of missing) console.error('  ✗ ' + label + '  (marqueur : « ' + needle + ' »)');
}
if (gone.length) {
  console.error('\nFichiers manquants :');
  for (const f of gone) console.error('  ✗ ' + f);
}
console.error('\nRéparation : recopier les sections listées depuis .github/SYNC-BOT.md dans le template');
console.error('local du bot, puis restaurer main (git revert du commit d\'écrasement ou re-greffe).');
process.exit(1);
