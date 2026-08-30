// Garde-fou CSP : chaque <script> QUE LE NAVIGATEUR EXÉCUTE doit être autorisé par la meta
// Content-Security-Policy, sinon le navigateur bloque tout le JS du site déployé. Lancé par
// .github/workflows/check-csp.yml — script séparé pour éviter tout échappement shell (un node -e
// entre quotes bash avait rendu le test toujours faux).
//
// Audit 30/08 — ce garde était AVEUGLE aux <script> porteurs d'attributs : il cherchait
// /<script>…<\/script>/ tout court. Un « <script defer>…</script> » ajouté à la page laissait
// check-csp vert (exit 0) alors que Chrome répond « Executing inline script violates the following
// Content-Security-Policy directive… The action has been blocked ». Le recensement des scripts vit
// désormais dans .github/html-scripts.js, partagé avec unit-tests.js : une seule réponse à la
// question « qu'exécute le navigateur ? ».
const fs = require('fs'), crypto = require('crypto');
const H = require('./html-scripts.js');

// Le parseur HTML normalise CRLF en LF avant d'évaluer le script : c'est sur la version LF que le
// navigateur calcule le hash. GitHub Pages sert la version Git (LF) ; normaliser évite un faux
// négatif sur une copie de travail Windows (autocrlf).
const html = H.normalize(fs.readFileSync('index.html', 'utf8'));

// ⚠ La valeur de content= contient des apostrophes ('self', 'sha256-…') : il faut capturer sur le
// guillemet DOUBLE, pas sur [^"'] — sinon la capture s'arrête au premier 'self' et le garde croit
// qu'il n'y a pas de script-src (il échouait alors pour la mauvaise raison).
const metaTag = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i);
if (!metaTag) { console.error('Pas de meta Content-Security-Policy dans index.html'); process.exit(1); }
const content = metaTag[0].match(/content="([^"]*)"/i) || metaTag[0].match(/content='([^']*)'/i);
if (!content) { console.error('Meta CSP sans attribut content= exploitable'); process.exit(1); }
const directives = {};
for (const part of content[1].split(';')) {
  const bits = part.trim().split(/\s+/);
  if (bits[0]) directives[bits[0].toLowerCase()] = bits.slice(1);
}
const csp = directives['script-src'];
if (!csp) { console.error('Pas de directive script-src dans la meta CSP'); process.exit(1); }
const cspText = csp.join(' ');

const all = H.scripts(html);
const allowed = new Set(csp.filter((s) => /^'sha(256|384|512)-/.test(s)).map((s) => s.slice(1, -1)));
const current = [];
let ko = 0;

for (const [i, s] of all.entries()) {
  const attrs = Object.keys(s.attrs).length ? ' [' + Object.entries(s.attrs).map(([k, v]) => (v ? k + '="' + v + '"' : k)).join(' ') + ']' : '';

  if (s.inert) { console.log(`script ${i}${attrs} — type inerte (${s.type}), non exécuté : hors script-src.`); continue; }

  if (s.external) {
    // Un <script src> n'est JAMAIS couvert par un hash : il lui faut 'self' (même origine) ou son
    // hôte listé. La CSP actuelle ne liste ni l'un ni l'autre → tout script externe serait bloqué.
    const src = s.attrs.src || '';
    const sameOrigin = !/^([a-z]+:)?\/\//i.test(src);
    const origin = sameOrigin ? null : (src.match(/^(?:[a-z]+:)?\/\/[^/]+/i) || [''])[0].replace(/^\/\//, 'https://');
    const ok = csp.some((t) => t === '*' || t === "'strict-dynamic'" || (sameOrigin && t === "'self'") || (origin && (t === origin || t === origin + '/')));
    console.log(`script ${i}${attrs} — EXTERNE (${src}) ${ok ? 'autorisé' : '*** NON AUTORISÉ par script-src → le navigateur le bloquera ***'}`);
    if (!ok) ko++;
    continue;
  }

  const hash = 'sha256-' + crypto.createHash('sha256').update(s.body, 'utf8').digest('base64');
  current.push(hash);
  const ok = allowed.has(hash);
  console.log(`script ${i}${attrs} (${s.body.length} car.) ${hash} ${ok ? 'OK' : 'ABSENT DE LA CSP'}`);
  if (!ok) ko++;
}

// Sens inverse : chaque hash listé doit correspondre à un script ACTUEL. Un hash orphelin (reste d'une
// ancienne version) garde l'ancien script exécutable s'il était réinjecté — c'est passé inaperçu une fois.
for (const h of allowed) {
  if (!current.includes(h)) { console.error(`hash ORPHELIN dans la CSP (aucun script actuel ne correspond) : ${h}`); ko++; }
}

// 'unsafe-inline' est ignoré par le navigateur dès qu'un hash est présent, mais sa présence dans la
// source laisse croire à une porte ouverte : on le refuse plutôt que de le laisser semer le doute.
if (cspText.includes("'unsafe-inline'") || cspText.includes("'unsafe-eval'")) {
  console.error("script-src contient 'unsafe-inline'/'unsafe-eval' : la protection par hash ne sert plus à rien.");
  ko++;
}

if (ko) {
  console.error(`\n${ko} incohérence(s) hash/CSP. Recalcule le(s) hash et mets à jour la meta Content-Security-Policy (un hash par script inline actuel, rien de plus).`);
  process.exit(1);
}
console.log(`\nCSP OK — ${current.length} script(s) inline couvert(s), ${all.length - current.length} bloc(s) inerte(s)/externe(s).`);
