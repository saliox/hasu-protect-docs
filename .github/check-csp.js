// Garde-fou CSP : chaque <script> inline de index.html doit avoir son hash sha256
// dans la meta Content-Security-Policy, sinon le navigateur bloque tout le JS du
// site déployé. Lancé par .github/workflows/check-csp.yml — script séparé pour
// éviter tout échappement shell (un node -e entre quotes bash avait rendu le
// test toujours faux).
const fs = require('fs'), crypto = require('crypto');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/script-src ([^;]+);/);
if (!m) { console.error('Pas de directive script-src trouvée'); process.exit(1); }
const csp = m[1];
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
const current = scripts.map(s => 'sha256-' + crypto.createHash('sha256').update(s, 'utf8').digest('base64'));
let ko = 0;
for (const [i, s] of scripts.entries()) {
  const ok = csp.includes("'" + current[i] + "'");
  console.log(`script ${i} (${s.length} car.) ${current[i]} ${ok ? 'OK' : 'ABSENT DE LA CSP'}`);
  if (!ok) ko++;
}
// Sens inverse : chaque hash listé doit correspondre à un script ACTUEL. Un hash orphelin (reste d'une
// ancienne version) garde l'ancien script exécutable s'il était réinjecté — c'est passé inaperçu une fois.
for (const m of csp.matchAll(/'(sha256-[^']+)'/g)) {
  if (!current.includes(m[1])) { console.error(`hash ORPHELIN dans la CSP (aucun script actuel ne correspond) : ${m[1]}`); ko++; }
}
if (ko) {
  console.error(`\n${ko} incohérence(s) hash/CSP. Recalcule le(s) hash et mets à jour la meta Content-Security-Policy (un hash par script inline actuel, rien de plus).`);
  process.exit(1);
}
