// Relevé quotidien des votes « Cette page t'a aidé ? » : lit les noms de commandes dans index.html,
// interroge les compteurs Abacus (Oui = cmd-<n>, Non = cmd-<n>-no) et publie votes.json
// (seules les commandes ayant au moins un vote sont conservées). Lancé par votes.yml.
const fs = require('fs');
const names = [...new Set([...fs.readFileSync('index.html', 'utf8').matchAll(/data-n="([a-z0-9]+)"/g)].map((m) => m[1]))];
async function get(key) {
  try {
    const r = await fetch('https://abacus.jasoncameron.dev/get/hasu-protect-docs/' + key, { cache: 'no-store' });
    if (!r.ok) return 0;
    const d = await r.json();
    return isFinite(d.value) && d.value > 0 ? d.value : 0;
  } catch (e) { return 0; }
}
(async () => {
  const out = {};
  const queue = [...names];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const n = queue.pop();
      const [y, ry, no, rn] = await Promise.all([get('cmd-' + n), get('cmd-' + n + '-ry'), get('cmd-' + n + '-no'), get('cmd-' + n + '-rn')]);
      const yes = Math.max(0, y - ry), non = Math.max(0, no - rn); // NET : votes posés − votes retirés
      if (yes || non) out[n] = [yes, non];
    }
  }));
  fs.writeFileSync('votes.json', JSON.stringify({ generated: Date.now(), votes: out }));
  console.log('votes.json :', Object.keys(out).length, 'commandes avec votes /', names.length, 'commandes');
})();
