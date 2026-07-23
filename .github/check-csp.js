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
let ko = 0;
for (const [i, s] of scripts.entries()) {
  const h = 'sha256-' + crypto.createHash('sha256').update(s, 'utf8').digest('base64');
  const ok = csp.includes("'" + h + "'");
  console.log(`script ${i} (${s.length} car.) ${h} ${ok ? 'OK' : 'ABSENT DE LA CSP'}`);
  if (!ok) ko++;
}
if (ko) {
  console.error(`\n${ko} script(s) inline seraient bloqués par la CSP. Recalcule le(s) hash et mets à jour la meta Content-Security-Policy.`);
  process.exit(1);
}
