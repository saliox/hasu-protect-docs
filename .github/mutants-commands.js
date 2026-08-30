'use strict';
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  mutants-commands.js — ÉPROUVER .github/check-commands.js PAR MUTATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// Un garde qui ne trouve jamais rien est indiscernable d'un garde cassé. Deux gardes de ce dépôt se
// sont fait démasquer comme ça le 30/08 (marqueurs de sentinelle non scopés, extraction de fonctions
// qui testait un leurre). Celui-ci doit donc PROUVER qu'il mord, défaut par défaut.
//
// ── Comment
//   On ne mute PAS le dépôt : chaque mutant est joué dans une copie jetable (os.tmpdir()), sur un
//   site FICTIF de 123 cartes, cohérent au départ. Rien à restaurer, donc aucun risque de laisser le
//   dépôt muté si un verrou Windows empêche la remise en état — le piège classique de ce genre de
//   campagne.
//
// ── Les deux pièges qu'on désamorce explicitement
//   1. LE TÉMOIN. Sans un cas non muté qui passe au VERT, « tous les mutants rougissent » ne prouve
//      rien : un garde qui rougit toujours obtient exactement le même score. Le témoin est joué en
//      premier ; s'il rougit, la campagne s'arrête et le dit.
//   2. LA LEVÉE. Si le code sous mutation LÈVE, l'assertion n'est jamais atteinte : aucun ❌ n'est
//      imprimé et la campagne se lit « vert ». Ici, chaque mutant est enveloppé, et toute exception
//      du harnais devient un ÉCHEC NOMMÉ. De plus, un mutant n'est « détecté » que si le garde sort
//      en erreur ET prononce le message attendu : un plantage du garde (code ≠ 0 mais message
//      absent) est compté comme un ÉCHEC, pas comme une détection.
//
//   node .github/mutants-commands.js
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ICI = __dirname;

// ── Le site fictif : 123 cartes, une prose qui promet 123, un stats.json qui dit 123, un manifeste
//    attesté sur 123. Il contient AUSSI deux chiffres qui ne doivent PAS être lus comme des
//    promesses : « 145 commandes » dans un commentaire du script déployé, « 999 commandes » dans le
//    bloc changelog. Si le témoin passe au vert, ces deux exclusions sont prouvées du même coup.
const NOMS = ['alpha', 'beta', 'gamma', ...Array.from({ length: 120 }, (_, i) => 'cmd' + String(i + 1).padStart(3, '0'))];
const DATE_SITE = 'Publié le 1 janvier 2026 à 00:00';

// ── Le niveau d'accès de la fixture. Les quatre paliers sont représentés largement : le garde refuse
//    d'attester une répartition où l'un d'eux serait anecdotique, et le témoin doit passer.
const LBL = { owner: '👑 Owner', admin: '🛡️ Admin', staff: '🔨 Staff', all: '👥 Tous' };
const ACCK = { owner: 'accOwner', admin: 'accAdmin', staff: 'accStaff', all: 'accAll' };
const PALIERS = ['all', 'staff', 'admin', 'owner'];
// Une commande hors fixture (`meme`, `pm2`…) retombe sur « all » : elle n'est de toute façon pas dans
// le manifeste, donc le contrôle d'accès la saute — ce sont les AUTRES mutants qui doivent la voir.
const TIER = (n) => (/^cmd\d{3}$/.test(n) ? PALIERS[Number(n.slice(3)) % 4] : ({ alpha: 'owner', beta: 'admin', gamma: 'staff' }[n] || 'all'));

// Le gabarit reprend celui d'index.html : `data-acc` sur la carte, badge `.accb` (classe + clé i18n +
// libellé) dans le titre. Les deux doivent dire la même chose, et dire la vérité du manifeste.
const badge = (t) => '<span class="accb acc-' + t + '" data-i18n="' + ACCK[t] + '">' + LBL[t] + '</span>';
const carte = (n, tier) => {
  const t = tier || TIER(n);
  return '<div class="cmd" tabindex="0" role="button" data-s="' + n + ' description" data-n="' + n + '" data-u="+' + n + '" data-cat="0" data-acc="' + t + '">'
    + '<div class="name">+' + n + ' ' + badge(t) + '</div></div>';
};

function pageFictive() {
  return [
    '<meta name="description" content="Bot Discord : antiraid et ' + NOMS.length + ' commandes — documentation.">',
    '<script type="application/ld+json">{"@type":"FAQPage","text":"Oui — les ' + NOMS.length + ' commandes sont gratuites."}</script>',
    '<div class="changelog"><h2>Dernière mise à jour</h2><div class="ver">' + DATE_SITE + '</div>',
    '<ul><li>Le site documentait 999 commandes de moins qu\'il ne fallait — fait daté, pas une promesse.</li></ul></div>',
    '<div class="quickstart"><h3>Premiers pas</h3></div>',
    // `(n) => carte(n)` et NON `carte` : `map` passe l'INDEX en 2e argument, qui deviendrait le
    // palier de la carte — 122 badges `acc-1`, `acc-2`… et une fixture morte dès le témoin.
    '<div class="grid">' + NOMS.map((n) => carte(n)).join('') + '</div>',
    '<details><summary>Gratuit ?</summary><div class="fqa"><span data-lang="en">Yes — all ' + NOMS.length + ' commands are free.</span></div></details>',
    '<script>/* Familles ajoutées (PR #19) : 145 commandes tombaient sur le générique */',
    // Le dictionnaire des libellés d'accès, à l'identique d'index.html : le garde y relit les quatre
    // textes au lieu de les recopier, donc la fixture doit le porter aussi.
    "var I18N={accOwner:{fr:'" + LBL.owner + "',en:'👑 Owner'},accAdmin:{fr:'" + LBL.admin + "',en:'🛡️ Admin'},accStaff:{fr:'" + LBL.staff + "',en:'🔨 Staff'},accAll:{fr:'" + LBL.all + "',en:'👥 Everyone'}};",
    'function md(s){return s;}</script>',
  ].join('\n');
}

function manifesteFictif() {
  return {
    attestation: {
      attesteLe: new Date().toISOString(),
      source: 'fixture de mutation',
      compteConfirmeParLeGenerateur: NOMS.length,
      changelogDuSite: DATE_SITE,
      nombre: NOMS.length,
    },
    commandes: [...NOMS].sort(),
    acces: Object.fromEntries([...NOMS].sort().map((n) => [n, TIER(n)])),
    nonDocumentees: [{ nom: 'pm2', fichier: 'pm2.js', raison: 'description vide' }],
    horsCatalogue: [],
  };
}

// ── Construction d'une copie jetable, puis exécution du garde dedans.
function preparer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-cmds-'));
  fs.mkdirSync(path.join(dir, '.github'));
  fs.copyFileSync(path.join(ICI, 'check-commands.js'), path.join(dir, '.github', 'check-commands.js'));
  fs.copyFileSync(path.join(ICI, 'html-scripts.js'), path.join(dir, '.github', 'html-scripts.js'));
  fs.writeFileSync(path.join(dir, 'index.html'), pageFictive());
  fs.writeFileSync(path.join(dir, 'stats.json'), JSON.stringify({ commands: NOMS.length, categories: 7 }));
  fs.writeFileSync(path.join(dir, '.github', 'commands.manifest.json'), JSON.stringify(manifesteFictif(), null, 2));
  return dir;
}

function jouer(dir, args) {
  const r = spawnSync(process.execPath, ['.github/check-commands.js', ...(args || [])], { cwd: dir, encoding: 'utf8' });
  return { code: r.status, sortie: String(r.stdout || '') + String(r.stderr || '') };
}

function jeter(dir) {
  // Windows garde parfois un verrou une fraction de seconde après la sortie du process fils.
  for (let i = 0; i < 5; i++) {
    try { fs.rmSync(dir, { recursive: true, force: true }); return; } catch (e) { /* on réessaie */ }
    const t = Date.now(); while (Date.now() - t < 60) { /* petite attente sans setTimeout */ }
  }
}

const patch = (dir, fichier, fn) => {
  const p = path.join(dir, fichier);
  const avant = fs.readFileSync(p, 'utf8');
  const apres = fn(avant);
  if (apres === avant) throw new Error('la mutation de ' + fichier + ' n\'a RIEN changé — le motif ne correspond plus à la fixture, le mutant ne prouverait rien');
  fs.writeFileSync(p, apres);
};
const patchJson = (dir, fichier, fn) => patch(dir, fichier, (s) => { const o = JSON.parse(s); fn(o); return JSON.stringify(o, null, 2); });

// ── Les mutants. `attendu` = fragments qui DOIVENT tous apparaître dans la sortie du garde.
const MUTANTS = [
  {
    nom: 'une carte retirée → le garde doit NOMMER la commande devenue invisible',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('beta'), '')),
    attendu: ['+beta', 'documentées NULLE PART'],
  },
  {
    nom: 'une carte pour une commande inexistante (le défaut « +meme »)',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('alpha'), carte('alpha') + carte('meme'))),
    attendu: ['+meme', "N'EXISTE PAS"],
  },
  {
    nom: 'deux cartes pour la même commande',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('gamma'), carte('gamma') + carte('gamma'))),
    attendu: ['+gamma', 'PLUSIEURS cartes'],
  },
  {
    nom: 'une carte perd son data-n → elle devient invisible pour le garde ET pour la recherche',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(' data-n="alpha"', '')),
    attendu: ['sans attribut data-n'],
  },
  {
    nom: 'le balisage des cartes change → le garde doit crier au lieu de compter zéro divergence',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(/class="cmd"/g, 'class="carte"')),
    attendu: ['ne reconnaît plus la page'],
  },
  {
    nom: 'la prose promet un catalogue plus gros que celui livré (meta, JSON-LD, FAQ)',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(NOMS.length + ' commandes', '241 commandes')),
    attendu: ['promet 241 commandes', 'en documente ' + NOMS.length],
  },
  {
    nom: 'la promesse anglaise seule dérive (FAQ en)',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(NOMS.length + ' commands', '300 commands')),
    attendu: ['promet 300 commandes'],
  },
  {
    nom: 'stats.json bouge et le manifeste ne suit pas → manifeste périmé, dit par son nom',
    muter: (d) => patchJson(d, 'stats.json', (o) => { o.commands = NOMS.length + 3; }),
    attendu: ['PÉRIMÉ', 'stats.json annonce ' + (NOMS.length + 3)],
  },
  {
    nom: 'le manifeste est retouché à la main (compte ≠ liste)',
    muter: (d) => patchJson(d, '.github/commands.manifest.json', (o) => { o.attestation.nombre = NOMS.length + 1; }),
    attendu: ['incohérent avec lui-même'],
  },
  {
    nom: 'le manifeste disparaît',
    muter: (d) => fs.rmSync(path.join(d, '.github', 'commands.manifest.json')),
    attendu: ['Manifeste des commandes illisible'],
  },
  {
    nom: 'le bot publie une version → l\'attestation doit être refaite',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(DATE_SITE, 'Publié le 30 août 2026 à 12:00')),
    attendu: ['a publié une version depuis la dernière attestation'],
  },
  {
    nom: 'l\'ancre de fraîcheur est supprimée de la page',
    muter: (d) => patch(d, 'index.html', (s) => s.replace('<div class="ver">' + DATE_SITE + '</div>', '')),
    attendu: ['repère de fraîcheur a disparu'],
  },
  {
    nom: 'l\'attestation dort depuis 400 jours (filet horaire)',
    muter: (d) => patchJson(d, '.github/commands.manifest.json', (o) => { o.attestation.attesteLe = new Date(Date.now() - 400 * 86400000).toISOString(); }),
    attendu: ['Attestation expirée'],
  },
  {
    nom: 'une commande volontairement muette réapparaît en carte',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('alpha'), carte('alpha') + carte('pm2'))),
    attendu: ['+pm2', 'volontairement non documentée'],
  },
  {
    nom: 'on tente de rafraîchir le tampon d\'attestation sans lire le dépôt du bot',
    muter: () => {},
    args: ['--write'],
    attendu: ['--write sans --bot'],
  },

  // ── NIVEAU D'ACCÈS — le contrôle ajouté le 30/08/2026. Sept mutants, un par façon de mentir.
  {
    nom: 'accès — une carte d\'owner se présente comme accessible à tous (le défaut « +lockdown »)',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('alpha'), carte('alpha', 'all'))),
    attendu: ['+alpha', "NIVEAU D'ACCÈS FAUX", 'owner'],
  },
  {
    nom: 'accès — une carte d\'admin se présente comme accessible à tous (le défaut « +guide »)',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('beta'), carte('beta', 'all'))),
    attendu: ['+beta', "NIVEAU D'ACCÈS FAUX", 'admin'],
  },
  {
    nom: 'accès — la classe du badge contredit data-acc (couleur ≠ filtre)',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('gamma'), carte('gamma').replace('acc-staff"', 'acc-owner"'))),
    attendu: ['+gamma', 'se contredit LUI-MÊME'],
  },
  {
    nom: 'accès — le TEXTE du badge contredit sa classe (l\'œil et le filtre racontent deux histoires)',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('gamma'), carte('gamma').replace('>' + LBL.staff + '<', '>' + LBL.all + '<'))),
    attendu: ['+gamma', 'se contredit LUI-MÊME'],
  },
  {
    nom: 'accès — une carte perd son badge visible : data-acc seul ne se voit pas',
    muter: (d) => patch(d, 'index.html', (s) => s.replace(carte('beta'), carte('beta').replace(badge('admin'), ''))),
    attendu: ['+beta', 'aucun badge'],
  },
  {
    nom: 'accès — un manifeste antérieur au contrôle (sans `acces`) ne doit pas le rendre INERTE',
    muter: (d) => patchJson(d, '.github/commands.manifest.json', (o) => { delete o.acces; }),
    attendu: ["n'atteste AUCUN niveau d'accès"],
  },
  {
    nom: 'accès — le manifeste oublie le palier d\'une commande (retouche à la main)',
    muter: (d) => patchJson(d, '.github/commands.manifest.json', (o) => { delete o.acces.gamma; }),
    attendu: ['+gamma', 'niveaux d\'accès'],
  },
  {
    nom: 'accès — les libellés disparaissent du dictionnaire de la page',
    muter: (d) => patch(d, 'index.html', (s) => s.replace("accOwner:{fr:'" + LBL.owner + "'", "accCouronne:{fr:'" + LBL.owner + "'")),
    attendu: ['libellés de niveau d\'accès ont disparu'],
  },
];

// ───────────────────────────────────────────────────────────────────────────────────────────────

let ok = 0, ko = 0;

function echec(nom, pourquoi, sortie) {
  ko++;
  console.error('❌ ' + nom);
  console.error('   ' + pourquoi);
  if (sortie) console.error('   ── sortie du garde ──\n' + sortie.split('\n').slice(0, 12).map((l) => '   | ' + l).join('\n'));
}

// ── 1. LE TÉMOIN. Sans lui, la campagne ne distingue pas un bon garde d'un garde qui rougit toujours.
{
  let dir = null;
  try {
    dir = preparer();
    const r = jouer(dir, []);
    if (r.code === 0) { ok++; console.log('✅ témoin — site fictif cohérent : le garde passe au VERT (les 123 cartes, la prose, stats.json et le manifeste concordent ; « 145 commandes » dans le script et « 999 commandes » dans le changelog sont bien ignorés).'); }
    else {
      echec('témoin — le site fictif COHÉRENT est refusé', 'le garde rougit sur une fixture saine : tous les mutants qui suivent rougiraient pour rien. Campagne interrompue.', r.sortie);
      console.error('\n' + ok + ' ok, ' + ko + ' échec(s) — campagne INTERROMPUE.');
      process.exit(1);
    }
  } catch (e) {
    echec('témoin — le harnais lui-même a levé', (e && e.message) || String(e));
    console.error('\n' + ok + ' ok, ' + ko + ' échec(s) — campagne INTERROMPUE.');
    process.exit(1);
  } finally { if (dir) jeter(dir); }
}

// ── 2. Les mutants.
let joues = 0;
for (const m of MUTANTS) {
  let dir = null;
  try {
    joues++;
    dir = preparer();
    m.muter(dir);
    const r = jouer(dir, m.args);
    if (r.code === 0) {
      echec(m.nom, 'le garde est resté VERT sur un site muté — il ne voit pas ce défaut.', r.sortie);
    } else {
      const manquants = m.attendu.filter((f) => !r.sortie.includes(f));
      if (manquants.length) {
        // Sortie ≠ 0 mais message absent : très probablement un PLANTAGE du garde. Le compter comme
        // une détection serait exactement le mensonge que cette campagne existe pour empêcher.
        echec(m.nom, 'le garde a bien échoué, mais SANS prononcer ' + manquants.map((x) => '« ' + x + ' »').join(' ni ') + ' — un plantage n\'est pas une détection.', r.sortie);
      } else { ok++; console.log('✅ ' + m.nom); }
    }
  } catch (e) {
    // LE PIÈGE : sans ce catch, une levée pendant la mutation sauterait l'assertion sans imprimer
    // le moindre ❌, et la campagne se lirait « vert ».
    echec(m.nom, 'le harnais a LEVÉ avant d\'atteindre l\'assertion : ' + ((e && e.message) || String(e)));
  } finally { if (dir) jeter(dir); }
}

// ── 3. Auto-contrôle : autant de mutants joués que déclarés (un `continue` malheureux se verrait).
if (joues !== MUTANTS.length) echec('auto-contrôle du harnais', joues + ' mutant(s) joué(s) pour ' + MUTANTS.length + ' déclaré(s) — des cas ont été sautés en silence.');
else ok++;

console.log('\n' + ok + ' ok, ' + ko + ' échec(s) sur ' + (MUTANTS.length + 2) + ' cas (1 témoin + ' + MUTANTS.length + ' mutants + 1 auto-contrôle).');
process.exit(ko ? 1 : 0);
