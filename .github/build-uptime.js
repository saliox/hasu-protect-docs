// Disponibilité du bot sur 7 jours, MESURÉE sur la source vivante.
//
// ⚠️ Histoire à ne pas répéter. Ce script reconstruisait la disponibilité depuis les COMMITS
// « heartbeat » de la branche `status`. Le 21/08 (commit 2cac99e9) la source vivante du site est
// passée à l'hébergeur ; le bot a cessé de pousser sur `status` le 26/08 — et personne n'a bougé ici.
// Résultat au 30/08 : zéro battement compté, 167 cases rouges sur 168 et « 6,2 % » dans le badge,
// à un clic du badge « En ligne » qui, lui, disait vrai. Le collecteur mesurait une source morte.
//
// Nouveau modèle, volontairement plus modeste et plus honnête : l'Action tourne une fois par heure,
// elle fait donc UNE observation par heure — « le heartbeat était-il frais à cet instant ? ».
//   1 = vu en ligne · 0 = vu hors ligne · ABSENT (null) = jamais observé → gris « hors données ».
// D'où expectedPerHour: 1 (et non 30 battements/h reconstruits). Le relevé est un REGISTRE qui
// s'accumule : chaque exécution ajoute son heure et fait glisser la fenêtre de 7 jours. Le fichier
// précédent doit donc être restauré depuis la branche `uptime` AVANT ce script (cf. uptime.yml) —
// sans lui, on repart d'une seule heure observée, ce qui reste vrai, juste pauvre.
//
// Sortie : { generated, days, expectedPerHour, observed, hours: [[epochMs_heure, 1|0|null], …] }
const HOUR = 3600000;
const HOURS = 7 * 24;
const FRESH = 10 * 60 * 1000; // même seuil de fraîcheur que build-growth.js
const HB_URL = process.env.HEARTBEAT_URL || 'https://142-93-164-47.sslip.io/heartbeat.json';

// PUR et testable : ancien relevé + observation du moment → relevé glissant.
// `beatAt` = horodatage du dernier battement lu, ou null/0 si la source est injoignable. Dans ce
// dernier cas on n'écrit RIEN pour l'heure courante : ne pas savoir n'est pas être en panne, et un
// trou se dessine en gris. C'est exactement la confusion qui a produit les 167 cases rouges.
function mergeHours(prevHours, nowMs, beatAt) {
  const map = new Map();
  for (const h of prevHours || []) {
    if (!Array.isArray(h) || !Number.isFinite(h[0])) continue;
    map.set(Math.floor(h[0] / HOUR) * HOUR, Number.isFinite(h[1]) ? (h[1] > 0 ? 1 : 0) : null);
  }
  const cur = Math.floor(nowMs / HOUR) * HOUR;
  if (Number.isFinite(beatAt) && beatAt > 0) {
    const vu = (nowMs - beatAt) < FRESH ? 1 : 0;
    // Une heure déjà observée EN LIGNE le reste : deux exécutions dans la même heure (relance
    // manuelle, rattrapage) ne doivent pas transformer un « vu en ligne » en « vu hors ligne ».
    const av = map.get(cur);
    map.set(cur, Math.max(Number.isFinite(av) ? av : 0, vu));
  }
  const hours = [];
  for (let h = cur - (HOURS - 1) * HOUR; h <= cur; h += HOUR) hours.push([h, map.has(h) ? map.get(h) : null]);
  return hours;
}

// PUR : relevé → badge shields.io. Aucune observation ⇒ le badge ne prétend RIEN (« n/a », gris)
// au lieu d'annoncer « 0 % » en rouge, qui accuse le bot d'une panne que personne n'a mesurée.
function badgeFor(hours) {
  const obs = (hours || []).filter((h) => Number.isFinite(h[1]));
  if (!obs.length) return { schemaVersion: 1, label: 'uptime 7 j', message: 'n/a', color: 'lightgrey' };
  const pct = obs.reduce((s, h) => s + h[1], 0) / obs.length * 100;
  const color = pct >= 99 ? 'brightgreen' : pct >= 95 ? 'green' : pct >= 80 ? 'yellow' : pct > 0 ? 'orange' : 'red';
  return { schemaVersion: 1, label: 'uptime 7 j', message: (pct >= 99.95 ? '100' : pct.toFixed(1)) + '%', color };
}

async function lireBattement(url) {
  const r = await fetch(url, { cache: 'no-store', headers: { 'user-agent': 'uptime-builder' } });
  if (!r.ok) throw new Error('heartbeat HTTP ' + r.status);
  const j = await r.json();
  if (!j || !Number.isFinite(j.at)) throw new Error('heartbeat sans « at »');
  return j.at;
}

// PUR : que garde-t-on du fichier précédent ? Le relevé publié jusqu'au 30/08 suit l'ANCIEN modèle
// (30 battements/h reconstruits depuis une branche morte). Ses 167 heures « à zéro » ne sont PAS des
// pannes observées : ce sont ses propres angles morts. Les importer peindrait une semaine de rouge
// mensonger dès la première exécution du nouveau collecteur — on repart donc d'un registre vierge.
// Le marqueur de format est expectedPerHour: 1 (une observation par heure).
function ledgerPrecedent(p) {
  if (!p || !Array.isArray(p.hours) || !p.hours.length) return [];
  if (p.expectedPerHour !== 1) return [];
  return p.hours;
}

module.exports = { mergeHours, badgeFor, ledgerPrecedent, HOURS, HOUR, FRESH };

if (require.main === module) {
  (async () => {
    const fs = require('fs');
    let prev = [];
    try {
      const p = JSON.parse(fs.readFileSync('uptime.json', 'utf8'));
      prev = ledgerPrecedent(p);
      if (!prev.length && p && Array.isArray(p.hours) && p.hours.length) console.log('relevé de l\'ancien modèle ignoré (' + p.hours.length + ' heures, expectedPerHour=' + p.expectedPerHour + ') → registre vierge');
    } catch (e) {}
    const now = Date.now();
    let beat = null;
    try { beat = await lireBattement(HB_URL); } catch (e) { console.log('heartbeat injoignable (' + e.message + ') → heure laissée en TROU, pas en panne'); }
    const hours = mergeHours(prev, now, beat);
    const observed = hours.filter((h) => Number.isFinite(h[1])).length;
    fs.writeFileSync('uptime.json', JSON.stringify({ generated: now, days: 7, expectedPerHour: 1, observed, hours }));
    fs.writeFileSync('badge.json', JSON.stringify(badgeFor(hours)));
    const enLigne = hours.filter((h) => h[1] === 1).length;
    console.log(`uptime.json : ${observed}/${hours.length} heures observées, ${enLigne} en ligne — badge « ${badgeFor(hours).message} »`);
  })().catch((e) => { console.error(e.message); process.exit(1); });
}
