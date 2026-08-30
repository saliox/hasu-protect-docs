'use strict';
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  check-commands.js — LE CATALOGUE DU SITE DOIT DIRE LA VÉRITÉ SUR LES COMMANDES DU BOT
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT QU'ON FERME (mesuré le 30/08/2026)
//   Le site documentait 189 commandes. Le bot en a 238. Personne ne l'a jamais signalé : aucun
//   contrôle ne comparait la doc au bot. Pire, la carte « +meme » a SURVÉCU à la suppression de
//   commands/meme.js — la doc faisait taper une commande morte. Les deux dérives sont silencieuses
//   par construction : rien ne les regarde.
//   Troisième dérive, découverte en écrivant ce garde : stats.json annonce 241 commandes (le badge
//   « commandes » de la page lit CE fichier), alors que le générateur du bot en compte 238. Trois
//   commandes supprimées le 23/08 (meme, memegame, rattrapage) sont restées dans le chiffre publié.
//
// ── LA DIFFICULTÉ, ET LE CHOIX
//   La CI de ce dépôt tourne sur GitHub Actions, où le dépôt du BOT N'EXISTE PAS. Un contrôle qui
//   lirait `../commands/` passerait en local et serait INERTE en CI : le genre de garde qui ne
//   trouve jamais rien, donc indiscernable d'un garde cassé.
//   Ce fichier ne choisit pas entre « manifeste » et « contrôle local » : il pose une CHAÎNE
//   D'ATTESTATION dont chaque maillon est vérifiable là où il vit.
//
//        dépôt du bot  ──(1)──▶  stats.json   ──(2)──▶  manifeste   ──(3)──▶  cartes   ──(4)──▶  prose
//        commands/*.js          "commands":N          les 238 NOMS         data-n=""        « N commandes »
//        (hors CI)              (voix du bot,         (.github/…json)      (index.html)     (meta, JSON-LD,
//                                déjà dans CE dépôt)                                          FAQ fr+en)
//
//   Maillons (2), (3) et (4) sont contrôlés EN CI, sans le dépôt du bot : les trois fichiers sont
//   ici. Maillon (1) est le seul qui exige le dépôt du bot ; il est contrôlé par le mode LOCAL
//   `--bot`, et c'est assumé.
//
//   Pourquoi ça ne dégénère pas en « manifeste périmé qui se tait » — la vraie objection :
//     • le manifeste ne porte pas seulement des noms, il porte une ATTESTATION (quand, depuis quoi,
//       contre quelle version du site) ;
//     • le tampon d'attestation ne peut être posé QUE par le mode `--bot` : il est physiquement
//       impossible de « rafraîchir la date » sans avoir relu commands/. Pas de rituel possible ;
//     • l'attestation EXPIRE sur l'ACTIVITÉ, pas sur une horloge : dès que le site publie un nouveau
//       changelog (donc dès que le bot sort une version — le seul moment où les commandes bougent),
//       la date de publication affichée par index.html ne correspond plus à celle attestée, et la CI
//       rougit en demandant une nouvelle attestation. Un filet horaire (180 j) couvre le cas où le
//       changelog du site serait lui aussi figé ;
//     • le compte du manifeste est confronté à stats.json, produit par le générateur du BOT et
//       committé ici : si le bot gagne ou perd une commande et que quelqu'un republie stats.json,
//       le manifeste est déclaré périmé AVANT même qu'on ait le dépôt du bot sous la main.
//
// ── CE QUE CE GARDE NE COUVRE PAS (à dire honnêtement, sinon il ment par omission)
//   • Une commande AJOUTÉE au bot alors que ni stats.json ni le manifeste ne sont republiés, et que
//     le site ne publie aucun changelog : invisible en CI. C'est irréductible — la CI ne peut pas
//     lire un dépôt qui n'est pas là. Seul `--bot` la voit. Les trois signaux ci-dessus rendent ce
//     scénario coûteux à atteindre, pas impossible.
//   • Le CONTENU des cartes : usage, description, alias, catégorie, niveau d'accès, traduction EN.
//     Ce garde ne compare que l'ENSEMBLE DES NOMS. Une carte au nom juste et au mode d'emploi faux
//     passe ici sans bruit.
//   • history.html et le site de doc secondaire : seul index.html est examiné.
//   • Les commandes délibérément non documentées sont listées par NOM ET PAR RAISON dans le
//     manifeste (`nonDocumentees`), et le mode `--bot` vérifie que chacune existe TOUJOURS et est
//     TOUJOURS muette. Une liste d'exclusions qui ne se plaint pas quand son entrée disparaît est
//     le défaut qu'on reproche à cmdtests.js — on ne le reproduit pas ici.
//
// ── UTILISATION
//   node .github/check-commands.js                     ← CI et local : maillons (2)(3)(4)
//   node .github/check-commands.js --bot ..            ← local : ajoute le maillon (1)
//   node .github/check-commands.js --bot .. --write    ← local : ré-atteste le manifeste
//   (`--bot ..` parce que, sur la machine de dev, le site vit dans `<dépôt du bot>/docs`.)
//
//   Éprouvé par mutation : .github/mutants-commands.js
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const H = require('./html-scripts.js');

const PAGE = 'index.html';
const STATS = 'stats.json';
const MANIFESTE = path.join('.github', 'commands.manifest.json');
const JOURS_FILET = 180; // filet horaire, quand même le changelog du site ne bouge plus

// ───────────────────────────────────────────────────────────────────────────────────────────────
//  LECTURE DE LA PAGE
// ───────────────────────────────────────────────────────────────────────────────────────────────

// Une carte de commande, c'est <div class="cmd" … data-n="nom" …>. Le motif exige que la classe se
// TERMINE après « cmd » (ou continue par une espace) : sans ça, `class="cmd-foot"` et `class="cmd-body"`
// seraient comptés comme des cartes — 378 « cartes » au lieu de 189, et le garde compare n'importe quoi.
const RX_CARTE = /<div\s+class="cmd(?:\s[^"]*)?"[^>]*>/g;

function cartesDe(html) {
  const noms = [];
  let balises = 0, sansNom = 0;
  RX_CARTE.lastIndex = 0;
  let m;
  while ((m = RX_CARTE.exec(html))) {
    balises++;
    const t = m[0].match(/data-n="([^"]*)"/);
    if (t) noms.push(t[1]); else sansNom++;
  }
  return { noms, balises, sansNom };
}

// Le repère de fraîcheur : la date de publication du changelog affichée par la page. C'est le seul
// endroit d'index.html qui bouge à CHAQUE version du bot, et c'est aussi le seul moment où les
// commandes changent. On s'y accroche.
function dateChangelog(html) {
  const m = html.match(/<div class="ver">([\s\S]*?)<\/div>/);
  if (!m) return null;
  return m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Zone où une mention « N commandes » est une PROMESSE FAITE AU LECTEUR (meta description, JSON-LD,
// FAQ), par opposition aux mentions HISTORIQUES qui doivent rester telles quelles.
// On neutralise, en préservant les décalages (remplacement par des espaces de même longueur) :
//   • le corps des <script> EXÉCUTABLES  → « 145 commandes tombaient sur le générique » est un
//     commentaire de code, pas une promesse. (Le JSON-LD, lui, est INERTE : il reste dans la zone,
//     c'est une déclaration publique lue par Google.)
//   • le bloc changelog → « le site documentait 191 commandes sur 241 » y sera écrit un jour, et
//     c'est un fait daté, pas une promesse courante.
//   • les commentaires HTML.
const blanchir = (s, a, b) => s.slice(0, a) + ' '.repeat(b - a) + s.slice(b);

function zoneProse(html) {
  let z = H.normalize(html);
  for (const s of H.scripts(z)) {
    if (!s.executable || s.external) continue;
    const debut = z.indexOf(s.body, s.index);
    if (debut >= 0) z = blanchir(z, debut, debut + s.body.length);
  }
  const a = z.indexOf('<div class="changelog">');
  const b = a >= 0 ? z.indexOf('<div class="quickstart"', a) : -1;
  if (a >= 0 && b > a) z = blanchir(z, a, b);
  z = z.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length));
  return z;
}

// « 241 commandes », « 241 commands ». Le motif exige le nombre COLLÉ au mot (au plus des espaces) :
// `scope=bot%20applications.commands` ne peut pas déclencher.
function promessesChiffrees(zone) {
  const out = [];
  const rx = /(\d{2,4})\s*(commandes?|commands?)\b/g;
  let m;
  while ((m = rx.exec(zone))) out.push({ n: Number(m[1]), extrait: zone.slice(Math.max(0, m.index - 55), m.index + 24).replace(/\s+/g, ' ').trim() });
  return out;
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
//  MAILLON (1) — LE DÉPÔT DU BOT (mode local uniquement)
// ───────────────────────────────────────────────────────────────────────────────────────────────
// Règles d'extraction RECOPIÉES de tools/docs-build.js (dépôt du bot) : c'est lui qui décide ce qui
// mérite une carte. Recopier, c'est risquer de diverger — d'où le contrôle croisé obligatoire
// ci-dessous : on demande AUSSI son compte au générateur lui-même, et on refuse d'attester si les
// deux ne tombent pas d'accord.
function commandesDuBot(racineBot) {
  const CMD = path.join(racineBot, 'commands');
  if (!fs.existsSync(CMD)) throw new Error('« ' + racineBot + ' » ne contient pas commands/ — ce n\'est pas la racine du dépôt du bot.');
  let FR = {};
  try { FR = JSON.parse(fs.readFileSync(path.join(racineBot, 'i18n', 'fr.json'), 'utf8')); } catch (e) { throw new Error('i18n/fr.json illisible dans le dépôt du bot : ' + e.message); }

  const vivantes = [];
  const muettes = [];       // un nom, mais aucune description → volontairement non documentées
  const sansMetadonnees = []; // pas de `name:` littéral → ce n'est pas un module de commande

  for (const f of fs.readdirSync(CMD).filter((x) => x.endsWith('.js') && x !== 'help.js')) {
    const full = fs.readFileSync(path.join(CMD, f), 'utf8');
    const ix = full.indexOf('module.exports');
    let src = ix >= 0 ? full.slice(ix) : full;
    let nom = (src.match(/name:\s*'([^']+)'/) || [])[1];
    if (!nom) { src = full; nom = (full.match(/name:\s*'([^']+)'/) || [])[1]; }
    if (!nom) { sansMetadonnees.push({ fichier: f, raison: 'aucun `name:` littéral — module utilitaire, pas une commande' }); continue; }
    const descKey = (src.match(/descKey:[ ]*'([^']+)'/) || [])[1];
    const desc = descKey ? String(FR[descKey] || '') : (src.match(/description:\s*'((?:[^'\\]|\\.)*)'/) || [])[1];
    if (!desc) { muettes.push({ nom, fichier: f, raison: 'description vide → commande secrète, volontairement absente du site' }); continue; }
    vivantes.push(nom);
  }
  vivantes.push('help'); // help.js est écarté de la boucle (il décrit les autres) — docs-build pose son entrée à la main
  vivantes.sort();
  muettes.sort((a, b) => a.nom.localeCompare(b.nom));
  sansMetadonnees.sort((a, b) => a.fichier.localeCompare(b.fichier));

  // Contrôle croisé OBLIGATOIRE. Une attestation ne vaut que ce que vaut sa source : si le
  // générateur du bot n'est pas joignable, ou s'il ne compte pas comme nous, on n'atteste pas.
  let compteGenerateur = null;
  const gen = path.join(racineBot, 'tools', 'docs-build.js');
  if (!fs.existsSync(gen)) throw new Error('tools/docs-build.js introuvable — impossible de croiser nos règles d\'extraction avec les siennes, donc impossible d\'attester.');
  const build = require(path.resolve(gen));
  compteGenerateur = build({ ecrire: false }).totalCmds; // `ecrire:false` = ne publie RIEN (cf. en-tête de docs-build.js)
  if (compteGenerateur !== vivantes.length) {
    throw new Error('nos règles d\'extraction ont DIVERGÉ de celles de tools/docs-build.js : ' + vivantes.length + ' ici, ' + compteGenerateur + ' chez lui. Réaligne commandesDuBot() avant d\'attester.');
  }
  return { vivantes, muettes, sansMetadonnees, compteGenerateur };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
//  LE CONTRÔLE
// ───────────────────────────────────────────────────────────────────────────────────────────────

function verifier(opts) {
  const erreurs = [];
  const ko = (titre, ...lignes) => erreurs.push({ titre, lignes });
  // Les noms sont le cœur du message — c'est ce qui distingue ce garde d'un compteur. On les
  // imprime tous jusqu'à 40, puis on résume : un mur de 238 lignes ne se lit pas non plus.
  const liste = (noms, suffixe) => {
    const l = noms.slice(0, 40).map((n) => '  ✗ +' + n + (suffixe || ''));
    if (noms.length > 40) l.push('  … et ' + (noms.length - 40) + ' autre(s) : ' + noms.slice(40).map((n) => '+' + n).join(' '));
    return l;
  };

  const html = fs.readFileSync(PAGE, 'utf8');
  const { noms, balises, sansNom } = cartesDe(html);

  // — Garde-fou du garde lui-même. Si le balisage des cartes change, le motif ne reconnaît plus rien
  //   et TOUS les contrôles qui suivent deviennent creux : « 0 carte, 0 divergence, tout va bien ».
  //   Un plancher de plausibilité transforme cette panne silencieuse en échec nommé.
  if (balises < 100) {
    ko('Le motif de reconnaissance des cartes ne reconnaît plus la page',
      balises + ' balise(s) <div class="cmd"> trouvée(s) — un catalogue de commandes en compte des centaines.',
      'Soit index.html a été vidé, soit son balisage a changé : adapte RX_CARTE dans .github/check-commands.js.',
      'Tant que ce point est rouge, aucun autre contrôle de ce fichier n\'a de valeur.');
  }
  if (sansNom) ko(sansNom + ' carte(s) sans attribut data-n', 'Une carte sans nom est invisible pour ce garde comme pour la recherche du site.');
  const doublons = [...new Set(noms.filter((n, i) => noms.indexOf(n) !== i))];
  if (doublons.length) ko('Commande documentée par PLUSIEURS cartes', ...doublons.map((n) => '  ✗ +' + n));

  const cartes = [...new Set(noms)].sort();

  // ── Maillon (3) : cartes ≡ manifeste, DANS LES DEUX SENS, et en NOMMANT chaque divergence.
  let man = null;
  try { man = JSON.parse(fs.readFileSync(MANIFESTE, 'utf8')); }
  catch (e) { ko('Manifeste des commandes illisible (' + MANIFESTE + ')', e.message, 'Régénère-le : node .github/check-commands.js --bot .. --write'); }

  if (man) {
    const attendues = Array.isArray(man.commandes) ? man.commandes : [];
    const att = man.attestation || {};

    if (attendues.length !== att.nombre) {
      ko('Manifeste incohérent avec lui-même',
        'attestation.nombre = ' + att.nombre + ', mais la liste `commandes` en contient ' + attendues.length + '.',
        'Un manifeste retouché à la main ne prouve plus rien : ré-atteste-le depuis le dépôt du bot.');
    }

    const absentes = attendues.filter((n) => !cartes.includes(n));
    const fantomes = cartes.filter((n) => !attendues.includes(n));
    if (absentes.length) {
      ko(absentes.length + ' commande(s) du bot ne sont documentées NULLE PART sur le site',
        ...liste(absentes, '  — aucune carte <div class="cmd" … data-n="…"> dans index.html'));
    }
    if (fantomes.length) {
      ko(fantomes.length + ' carte(s) documentent une commande qui N\'EXISTE PAS',
        ...liste(fantomes, '  — carte présente dans index.html, commande absente du manifeste'),
        'C\'est le défaut « +meme » : la doc fait taper une commande qui ne répond plus.');
    }

    // Les commandes volontairement muettes ne doivent surtout pas réapparaître en carte.
    const trahies = (man.nonDocumentees || []).map((x) => x.nom).filter((n) => cartes.includes(n));
    if (trahies.length) ko('Commande volontairement non documentée, pourtant présente sur le site', ...trahies.map((n) => '  ✗ +' + n));

    // ── Maillon (2) : le compte du manifeste face à la voix du bot déjà présente dans ce dépôt.
    let stats = null;
    try { stats = JSON.parse(fs.readFileSync(STATS, 'utf8')); } catch (e) { ko('stats.json illisible', e.message); }
    if (stats && Number.isInteger(stats.commands) && Number.isInteger(att.nombre) && stats.commands !== att.nombre) {
      ko('Le manifeste est PÉRIMÉ (ou stats.json l\'est)',
        'stats.json annonce ' + stats.commands + ' commandes — c\'est ce chiffre que le badge de la page affiche au visiteur.',
        'Le manifeste en atteste ' + att.nombre + '. Les deux viennent du bot : ils ne peuvent pas diverger sans qu\'un des deux ait vieilli.',
        'Ré-atteste : node .github/check-commands.js --bot .. --write   (et republie stats.json si c\'est lui qui a vieilli).');
    }

    // ── Fraîcheur de l'attestation, ancrée sur l'ACTIVITÉ du site plutôt que sur une horloge.
    const dateSite = dateChangelog(html);
    if (!dateSite) {
      ko('Le repère de fraîcheur a disparu d\'index.html',
        'Aucun <div class="ver"> : la date de publication du changelog était l\'ancre qui force à ré-attester le manifeste à chaque version du bot.',
        'Répare la page ou change d\'ancre dans .github/check-commands.js — mais n\'enlève pas l\'ancre sans la remplacer.');
    } else if (att.changelogDuSite && att.changelogDuSite !== dateSite) {
      ko('Le bot a publié une version depuis la dernière attestation',
        'Le site affiche « ' + dateSite +' », le manifeste a été attesté contre « ' + att.changelogDuSite + ' ».',
        'Une version, c\'est le seul moment où les commandes changent : ré-atteste depuis le dépôt du bot.',
        '  node .github/check-commands.js --bot .. --write');
    }
    if (att.attesteLe) {
      const jours = Math.floor((Date.now() - Date.parse(att.attesteLe)) / 86400000);
      if (Number.isFinite(jours) && jours > JOURS_FILET) {
        ko('Attestation expirée (filet horaire)',
          'Dernière lecture réelle de commands/ : il y a ' + jours + ' jours (limite ' + JOURS_FILET + ').',
          'Ce filet couvre le cas où même le changelog du site aurait cessé de bouger.',
          '  node .github/check-commands.js --bot .. --write');
      }
    }

    // ── Maillon (4) : la prose ne doit pas promettre un catalogue qu'elle ne livre pas.
    //   Les mêmes 7 phrases (meta, og, twitter, JSON-LD ×2, FAQ fr, FAQ en) portent le même chiffre :
    //   on les regroupe par chiffre promis, sinon un écart unique produit sept fois le même reproche.
    const menteuses = promessesChiffrees(zoneProse(html)).filter((p) => p.n !== cartes.length);
    for (const n of [...new Set(menteuses.map((p) => p.n))]) {
      const sites = menteuses.filter((p) => p.n === n);
      ko('La page promet ' + n + ' commandes et en documente ' + cartes.length + ' (' + sites.length + ' endroit' + (sites.length > 1 ? 's' : '') + ')',
        ...sites.map((p) => '  … ' + p.extrait + ' …'),
        'Meta description, JSON-LD et FAQ sont lus par les moteurs et par le visiteur : le chiffre doit être celui du catalogue.');
    }
  }

  // ── Maillon (1), local seulement.
  if (opts.bot) {
    const b = commandesDuBot(opts.bot);
    console.log('   (local) dépôt du bot lu : ' + b.vivantes.length + ' commandes documentables, ' + b.muettes.length + ' muettes, ' + b.sansMetadonnees.length + ' fichier(s) hors catalogue. Compte confirmé par tools/docs-build.js.');
    if (man && Array.isArray(man.commandes)) {
      const nouvelles = b.vivantes.filter((n) => !man.commandes.includes(n));
      const disparues = man.commandes.filter((n) => !b.vivantes.includes(n));
      if (nouvelles.length) ko(nouvelles.length + ' commande(s) du bot absente(s) du manifeste', ...nouvelles.map((n) => '  ✗ +' + n));
      if (disparues.length) ko(disparues.length + ' commande(s) du manifeste n\'existent plus dans le bot', ...disparues.map((n) => '  ✗ +' + n));
      // La liste d'exclusions se vérifie elle aussi : une exclusion dont le fichier a disparu, ou
      // qui est redevenue une commande documentable, MASQUERAIT une vraie commande en silence.
      const vivantesSet = new Set(b.vivantes);
      const muettesSet = new Set(b.muettes.map((x) => x.nom));
      for (const x of man.nonDocumentees || []) {
        if (vivantesSet.has(x.nom)) ko('Exclusion périmée : +' + x.nom + ' est redevenue une commande documentable', 'Elle serait masquée du site sans que rien ne le dise. Retire-la de `nonDocumentees` et documente-la.');
        else if (!muettesSet.has(x.nom)) ko('Exclusion fantôme : +' + x.nom + ' n\'existe plus dans le bot', 'C\'est le défaut de la liste d\'exclusions par noms de cmdtests.js : elle ne se plaint pas quand sa cible disparaît, puis masque une vraie commande le jour où le nom revit.');
      }
    }
    if (opts.write) {
      const contenu = {
        _lisezMoi: 'Manifeste ATTESTÉ des commandes du bot Hasu Protect. Produit UNIQUEMENT par « node .github/check-commands.js --bot <racine du bot> --write », qui lit réellement commands/ et croise son compte avec tools/docs-build.js. Ne le retouche pas à la main : le contrôle .github/check-commands.js compare `commandes.length` à `attestation.nombre` et à stats.json, et une retouche se voit.',
        attestation: {
          attesteLe: new Date().toISOString(),
          source: 'commands/*.js + i18n/fr.json du dépôt du bot, règles d\'extraction de tools/docs-build.js',
          compteConfirmeParLeGenerateur: b.compteGenerateur,
          changelogDuSite: dateChangelog(html),
          nombre: b.vivantes.length,
        },
        commandes: b.vivantes,
        nonDocumentees: b.muettes,
        horsCatalogue: b.sansMetadonnees,
      };
      fs.writeFileSync(MANIFESTE, JSON.stringify(contenu, null, 2) + '\n');
      console.log('   (local) manifeste ré-attesté : ' + MANIFESTE + ' — ' + b.vivantes.length + ' commandes.');
      return { erreurs: [], cartes, ecrit: true };
    }
  }

  return { erreurs, cartes };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────

function main(argv) {
  const iBot = argv.indexOf('--bot');
  const opts = { bot: iBot >= 0 ? argv[iBot + 1] : null, write: argv.includes('--write') };
  if (opts.write && !opts.bot) {
    console.error('❌ --write sans --bot : le tampon d\'attestation ne peut PAS être posé sans avoir relu le dépôt du bot.');
    console.error('   C\'est volontaire : une date qu\'on peut rafraîchir sans rien vérifier n\'atteste rien.');
    return 2;
  }
  let r;
  try {
    r = verifier(opts);
  } catch (e) {
    console.error('❌ Le contrôle n\'a pas pu s\'exécuter : ' + (e && e.message));
    console.error('   (Un garde qui plante est un garde qui ne dit rien — c\'est un échec, pas un incident.)');
    return 1;
  }
  if (r.ecrit) return 0;
  if (!r.erreurs.length) {
    console.log('✅ Catalogue : ' + r.cartes.length + ' cartes, une par commande du manifeste attesté, et la page annonce le même chiffre.');
    return 0;
  }
  console.error('❌ LE SITE NE DIT PAS LA VÉRITÉ SUR LES COMMANDES DU BOT — ' + r.erreurs.length + ' point(s) :');
  for (const e of r.erreurs) {
    console.error('\n• ' + e.titre);
    for (const l of e.lignes) console.error('  ' + l);
  }
  console.error('\nRappel : ce contrôle ne juge que l\'ENSEMBLE DES NOMS. Le contenu des cartes (usage, alias,');
  console.error('traduction) n\'est couvert par aucun garde de ce dépôt.');
  return 1;
}

module.exports = { cartesDe, zoneProse, promessesChiffrees, dateChangelog, commandesDuBot, verifier, main };

if (require.main === module) process.exit(main(process.argv.slice(2)));
