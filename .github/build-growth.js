// Relevé de croissance du réseau : ajoute un point horaire {t, s(erveurs), m(embres), c(ommandes)}
// à growth.json si le heartbeat est frais (< 10 min). Fenêtre glissante de 30 jours.
// Lancé par uptime.yml après build-uptime.js ; growth.json précédent récupéré depuis la branche uptime.
const fs = require('fs');
(async () => {
  let g = { points: [] };
  try { const p = JSON.parse(fs.readFileSync('growth.json', 'utf8')); if (p && Array.isArray(p.points)) g = p; } catch (e) {}
  const now = Date.now();
  try {
    const r = await fetch('https://raw.githubusercontent.com/saliox/hasu-protect-docs/status/heartbeat.json', { cache: 'no-store' });
    if (r.ok) {
      const hb = await r.json();
      if (hb && hb.at && now - hb.at < 600000) {
        g.points.push({ t: now, s: hb.servers ?? null, m: hb.members ?? null, c: hb.commands ?? null });
      } else {
        console.log('heartbeat périmé (' + (hb && hb.at ? Math.round((now - hb.at) / 60000) + ' min' : 'absent') + ') → pas de point');
      }
    }
  } catch (e) { console.log('heartbeat injoignable → pas de point'); }
  const cutoff = now - 30 * 24 * 3600000;
  g.points = g.points.filter((p) => p.t >= cutoff);
  g.generated = now;
  fs.writeFileSync('growth.json', JSON.stringify(g));
  console.log('growth.json :', g.points.length, 'points');
})();
