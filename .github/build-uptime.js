// Reconstruit la disponibilité du bot sur 7 jours à partir des commits « heartbeat »
// de la branche `status` (un battement ≈ toutes les 2 min quand le bot tourne).
// Lancé toutes les heures par .github/workflows/uptime.yml, qui publie uptime.json
// sur la branche `uptime` (branche dédiée : ni main ni status ne sont touchées —
// pousser sur status risquerait un conflit avec les push du bot).
// Sortie : { generated, days, expectedPerHour, hours: [[epochMs_heure, nbBattements], …] }
const HOURS = 7 * 24;
const PER_PAGE = 100;

async function fetchCommits(repo, token, sinceISO) {
  const all = [];
  for (let page = 1; page <= 80; page++) {
    const r = await fetch(`https://api.github.com/repos/${repo}/commits?sha=status&per_page=${PER_PAGE}&page=${page}&since=${sinceISO}`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'uptime-builder' },
    });
    if (!r.ok) throw new Error(`API GitHub ${r.status} (page ${page})`);
    const batch = await r.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const c of batch) all.push(Date.parse(c.commit.committer.date));
    if (batch.length < PER_PAGE) break;
  }
  return all;
}

// Pur et testable : timestamps de battements → seaux horaires.
function buildBuckets(beatTimes, nowMs) {
  const endHour = Math.floor(nowMs / 3600000) * 3600000; // heure courante exclue (incomplète)
  const startHour = endHour - HOURS * 3600000;
  const counts = new Map();
  for (const t of beatTimes) {
    if (!isFinite(t) || t < startHour || t >= endHour) continue;
    const h = Math.floor(t / 3600000) * 3600000;
    counts.set(h, (counts.get(h) || 0) + 1);
  }
  const hours = [];
  for (let h = startHour; h < endHour; h += 3600000) hours.push([h, counts.get(h) || 0]);
  return hours;
}

module.exports = { buildBuckets, HOURS };

if (require.main === module) {
  (async () => {
    const repo = process.env.GITHUB_REPOSITORY || 'saliox/hasu-protect-docs';
    const token = process.env.GITHUB_TOKEN;
    if (!token) { console.error('GITHUB_TOKEN manquant'); process.exit(1); }
    const now = Date.now();
    const since = new Date(now - (HOURS + 2) * 3600000).toISOString();
    const beats = await fetchCommits(repo, token, since);
    const hours = buildBuckets(beats, now);
    const total = hours.reduce((s, x) => s + x[1], 0);
    const out = { generated: now, days: 7, expectedPerHour: 30, hours };
    require('fs').writeFileSync('uptime.json', JSON.stringify(out));
    // Badge shields.io (endpoint) pour le README : couverture 7 j, plafonnée à 100.
    const pct = Math.min(100, total / (hours.length * 30) * 100);
    const color = pct >= 99 ? 'brightgreen' : pct >= 95 ? 'green' : pct >= 80 ? 'yellow' : pct > 0 ? 'orange' : 'red';
    require('fs').writeFileSync('badge.json', JSON.stringify({ schemaVersion: 1, label: 'uptime 7 j', message: (pct >= 99.95 ? '100' : pct.toFixed(1)) + '%', color }));
    console.log(`uptime.json : ${beats.length} battements sur ${hours.length} h (couverture ${(total / (hours.length * 30) * 100).toFixed(1)} %)`);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
