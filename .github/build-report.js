// Rapport hebdo : lit les données réelles publiées sur la branche `uptime` (uptime.json,
// growth.json, votes.json) et écrit report.md — posté en issue par weekly.yml chaque lundi.
// Aucune invention : tout vient des relevés automatiques.
const fs = require('fs');
const RAW = 'https://raw.githubusercontent.com/saliox/hasu-protect-docs/uptime/';

async function grab(f) {
  try { const r = await fetch(RAW + f, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; }
}
const fmt = (n) => Number(n).toLocaleString('fr-FR');

(async () => {
  const [up, growth, votes] = await Promise.all([grab('uptime.json'), grab('growth.json'), grab('votes.json')]);
  const L = [];
  L.push('## 📊 Rapport hebdo — Hasu Protect');
  L.push('');
  // Disponibilité 7 j
  if (up && Array.isArray(up.hours) && up.hours.length) {
    const total = up.hours.reduce((s, x) => s + x[1], 0);
    const pct = Math.min(100, (total / (up.hours.length * (up.expectedPerHour || 30))) * 100);
    const okH = up.hours.filter((x) => x[1] >= 27).length;
    L.push(`**🛡️ Disponibilité (7 j)** : ${pct >= 99.95 ? '100' : pct.toFixed(1)} % — ${okH}/${up.hours.length} heures pleines`);
  } else L.push('**🛡️ Disponibilité (7 j)** : données indisponibles');
  // Croissance sur 7 j
  if (growth && Array.isArray(growth.points) && growth.points.length) {
    const now = Date.now(), week = growth.points.filter((p) => p.t >= now - 7 * 24 * 3600000);
    const a = week[0], b = week[week.length - 1];
    if (a && b && a !== b) {
      const d = (x, y) => (y - x >= 0 ? '+' : '') + fmt(y - x);
      L.push(`**📈 Croissance (7 j)** : serveurs ${fmt(b.s)} (${d(a.s, b.s)}) · membres ${fmt(b.m)} (${d(a.m, b.m)})`);
    } else L.push(`**📈 Croissance** : ${week.length} relevé(s) cette semaine — le bot doit être en ligne pour en produire`);
  } else L.push('**📈 Croissance** : aucun relevé encore');
  // Avis sur la doc
  if (votes && votes.votes && Object.keys(votes.votes).length) {
    const arr = Object.entries(votes.votes).map(([n, [y, no]]) => ({ n, y, no, score: y - no }));
    const top = [...arr].sort((x, y) => y.score - x.score).slice(0, 3);
    const flop = [...arr].filter((x) => x.no > 0).sort((x, y) => x.score - y.score).slice(0, 3);
    L.push(`**👍 Doc la plus utile** : ${top.map((x) => `\`+${x.n}\` (+${x.score})`).join(' · ')}`);
    if (flop.length) L.push(`**👎 À améliorer** : ${flop.map((x) => `\`+${x.n}\` (${x.y}👍/${x.no}👎)`).join(' · ')}`);
  } else L.push('**👍 Avis sur la doc** : aucun vote pour le moment');
  if (votes && isFinite(votes.visits)) L.push(`**👀 Visites du site (total)** : ${fmt(votes.visits)}`);
  L.push('');
  L.push('_Rapport automatique (weekly.yml) — données des relevés `uptime`/`growth`/`votes` de la branche `uptime`._');
  fs.writeFileSync('report.md', L.join('\n'));
  console.log(L.join('\n'));
})();
