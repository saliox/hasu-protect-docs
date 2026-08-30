// Relevé de croissance du réseau : ajoute un point horaire {t, s(erveurs), m(embres), c(ommandes)}
// à growth.json si le heartbeat est frais (< 10 min). Fenêtre glissante de 30 jours.
// Lancé par uptime.yml après build-uptime.js ; growth.json précédent récupéré depuis la branche uptime.
//
// ⚠️ Il lisait le heartbeat de la branche `status`, que le bot n'alimente plus depuis le 26/08 : le
// battement avait des JOURS d'avance sur le seuil de 10 min, donc plus aucun point n'était ajouté.
// La courbe est restée gelée au 21/08 (19 serveurs / 4 357 membres) sous un titre « 30 derniers
// jours », à côté de badges qui affichaient 20 / 4 340 — et la fenêtre glissante l'aurait VIDÉE le
// 20/09, faisant disparaître le panneau sans un bruit. On lit maintenant la source réellement vivante.
const fs = require('fs');
const HB_URL = process.env.HEARTBEAT_URL || 'https://142-93-164-47.sslip.io/heartbeat.json';
(async () => {
  let g = { points: [] };
  try { const p = JSON.parse(fs.readFileSync('growth.json', 'utf8')); if (p && Array.isArray(p.points)) g = p; } catch (e) {}
  const now = Date.now();
  try {
    const r = await fetch(HB_URL, { cache: 'no-store' });
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
