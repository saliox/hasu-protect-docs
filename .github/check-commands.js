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
//        (hors CI)              (voix du bot,         + leur NIVEAU        + data-acc       (meta, JSON-LD,
//                                déjà dans CE dépôt)   D'ACCÈS RÉEL         + badge .accb      FAQ fr+en)
//                                                     (.github/…json)      (index.html)
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
// ── LE NIVEAU D'ACCÈS — AJOUTÉ LE 30/08/2026, ET C'EST UN ÉLARGISSEMENT DE PORTÉE ASSUMÉ
//   Ce garde ne comparait QUE l'ensemble des noms ; son en-tête le disait, et c'est précisément par
//   ce trou qu'est passé le défaut suivant : 63 des 238 cartes annonçaient un niveau d'accès FAUX,
//   dans les deux sens. `+guide`, `+setup`, `+guardian`, `+trust`, `+ticket`… affichaient « 👥 Tous »
//   alors qu'il faut Administrateur (un membre essaie et se fait refuser sans comprendre) ;
//   `+antiraid`, `+lockdown`, `+punish`, `+backup`, `+nuke`, `+addrole`, `+delrole` affichaient
//   « 🛡️ Admin » ou « 👥 Tous » alors qu'ils sont au palier owner — un administrateur croyait
//   disposer d'un levier qu'il n'a pas, ce qui est pire : il peut compter dessus au mauvais moment.
//   Cause : tools/docs-build.js déduisait le badge de la seule PRÉSENCE dans `COMMAND_PERMS`
//   (`absente → 👥 Tous`), alors que systems/permissions.js fait retomber toute commande ABSENTE de
//   cette table au palier 2 (admin). La branche « absente → Tous » était fausse par construction.
//
//   LA PORTE RÉELLE, telle qu'elle est désormais attestée (mode `--bot`) :
//     ownerOnly du fichier de commande            → owner   (le répartiteur refuse avant `canUse`)
//     branche spéciale du répartiteur (index.js)  → owner   (`nuke`/`addrole`/`delrole` : owner du
//                                                            serveur ou liste `nuke_allowed`)
//     sinon `commandLevel(nom)` de permissions.js → 3 owner · 2 admin · 1 staff · 0 all
//   Ces valeurs ne sont pas RECOPIÉES : `systems/permissions.js` du dépôt du bot est exécuté tel
//   quel (base et owners stubés, aucune écriture, aucune ouverture de base), donc `PUBLIC`,
//   `JEUX_PUBLICS`, `COMMAND_PERMS` et `LEVEL_OVERRIDE` sont lus à la source. La seule règle
//   recopiée est la branche `nuke/addrole/delrole` du répartiteur : elle est donc ASSERTÉE dans
//   index.js à chaque attestation, et son absence est un échec nommé, pas un silence.
//
//   Le niveau attesté est comparé en CI à DEUX choses par carte, qui doivent s'accorder entre elles :
//   l'attribut `data-acc` (celui que lisent les puces de filtre) et le badge VISIBLE `.accb`
//   (classe `acc-*`, clé `data-i18n`, et le libellé lui-même, relu dans le dictionnaire de la page).
//   Une carte dont la classe dit « admin » et le texte « 👥 Tous » est refusée : c'est le cas où le
//   filtre et l'œil racontent deux histoires différentes.
//
// ── LA CATÉGORIE — AJOUTÉE PAR LE CHANTIER 2, SUR LE MODÈLE EXACT DU NIVEAU D'ACCÈS
//   `check-commands.js` excluait NOMMÉMENT la catégorie de sa portée. Conséquence mesurée : une carte
//   qui change de `data-cat`, une commande nouvellement mal rangée, une retouche du bloc MOVES — la CI
//   restait verte. La recatégorisation du 11/08/2026 a dérivé pour exactement cette raison.
//
//   La catégorie n'est PAS un rangement d'affichage. `systems/permissions.js` require `commands/help.js`
//   et ferme TOUS les noms de « 🛡️ Sécurité & Antiraid » et « 👑 Owner du bot » (`CATEGORIES_FERMEES`) :
//   89 commandes qu'aucun `+customperm` ne peut rouvrir. Ranger une carte hors de ces deux catégories
//   laisse croire qu'on peut en déléguer l'accès ; l'y ranger par erreur promet un verrou inexistant.
//
//   CE QUI EST ATTESTÉ : `categories` = { nom → index 0..6 }. L'index n'est écrit nulle part dans
//   help.js — il naît de la RÈGLE de `tools/docs-build.js:119-130`, rejouée ici à l'identique (ordre
//   d'insertion de la table → catégories vides écartées → « Autres » en queue → tri par CAT_ORDER).
//
//   CE QUI EST COMPARÉ EN CI, trois choses qui doivent s'accorder, exactement comme `data-acc` et le
//   badge `.accb` pour l'accès :
//     • la catégorie ATTESTÉE (help.js) ;
//     • `data-cat` — ce que lisent les puces de filtre `.navf` et les compteurs ;
//     • la `<section id="cN">` qui contient PHYSIQUEMENT la carte — le titre sous lequel l'œil la
//       trouve, et la couleur d'accent (`--cc` → `data-c`) qu'elle en hérite.
//   Une carte dont `data-cat` et la section divergent s'affiche sous un titre ET disparaît quand on
//   clique sur ce même titre : le filtre et l'œil racontent deux histoires, le défaut déjà nommé.
//
//   LE POINT DUR — LA TABLE `MOVES`, ET LE CHOIX QU'ELLE IMPOSE
//   Le script inline d'index.html déplace 4 cartes AU CHARGEMENT — `say`, `embed`, `dm`, `close` vers
//   « 🏘️ Communauté & Utilitaires ». Il réécrit `dataset.cat`, réaligne `data-c` sur le `--cc` de la
//   section d'arrivée, et y déplace le nœud. Le fichier STATIQUE garde donc légitimement l'ancien rangement,
//   et la catégorie que voit le visiteur n'est pas `data-cat`. D'où deux comparaisons distinctes :
//     • CONTRE commands/help.js : la catégorie EFFECTIVE, soit `MOVES[nom]` quand l'entrée existe ET que sa
//       section de destination existe (sinon le script sort sur `if(!grid)return` et rien ne bouge),
//       soit `data-cat`. MOVES est donc CRÉDITÉ, pas ignoré : une carte qu'il range là où help.js la range
//       est acceptée, `data-cat` périmé compris — c'est tout le rôle de la table pendant qu'index.html
//       attend d'être régénéré. Mais il n'ACHÈTE rien : un déplacement vers une catégorie que help.js refuse
//       reste ROUGE, et aucune ré-attestation ne l'éteint — `--bot --write` refige la table, il ne demande
//       pas son avis à help.js. C'est ce qui rend coûteux de recatégoriser une commande aux yeux du visiteur
//       sans toucher au bot : la dérive du 11/08 refaite ne passe plus, même ATTESTÉE.
//     • ENTRE EUX : `data-cat` et la `<section id="cN">` qui contient la carte, qui doivent rester ÉGAUX
//       dans le fichier — docs-build.js les écrit avec le même `i`, et MOVES les déplace ENSEMBLE. C'est
//       ce contrôle-là, et non celui de help.js, qui voit un `data-cat` retouché à la main.
//   La table reste ATTESTÉE par ailleurs (`attestation.deplacementsDuSite`), et chaque entrée doit rester
//       VIVANTE : carte existante, destination existante, et déplacement qui déplace vraiment.
//   Ce que ça coûte à qui dérive : ajouter un déplacement — c'est-à-dire recatégoriser une commande AUX
//   YEUX DU VISITEUR sans toucher au bot — rougit la CI tant que personne n'a rouvert commands/help.js.
//   Ce que ça coûte à qui répare : ranger la commande dans help.js rend le déplacement MORT, et le garde
//   le dit par son nom au lieu de laisser l'exception pourrir dans la table. C'est le reproche fait à
//   la liste d'exclusions de cmdtests.js, qu'on ne reproduit pas ici non plus.
//
// ── CE QUE CE GARDE NE COUVRE PAS (à dire honnêtement, sinon il ment par omission)
//   • Une commande AJOUTÉE au bot alors que ni stats.json ni le manifeste ne sont republiés, et que
//     le site ne publie aucun changelog : invisible en CI. C'est irréductible — la CI ne peut pas
//     lire un dépôt qui n'est pas là. Seul `--bot` la voit. Les trois signaux ci-dessus rendent ce
//     scénario coûteux à atteindre, pas impossible.
//   • Le RESTE du contenu des cartes : usage, description, alias, traduction EN. Ce garde compare
//     l'ENSEMBLE DES NOMS, le NIVEAU D'ACCÈS et la CATÉGORIE, rien d'autre. Une carte au nom juste, au
//     badge juste, à la bonne place et au mode d'emploi faux passe ici sans bruit.
//   • Le compteur « (N) » des en-têtes de section : le script qui applique MOVES le RECALCULE dans le
//     navigateur, donc un chiffre figé faux n'est visible que sans JavaScript. Délibérément non couvert :
//     le vérifier ferait rougir deux fois chaque ajout ou retrait de carte, pour un défaut invisible.
//   • L'ORIGINE d'une carte que MOVES déplace. Sa catégorie EFFECTIVE est jugée contre help.js, et son
//     `data-cat` contre sa `<section>` ; mais rien n'atteste D'OÙ elle part, et le script réécrit de toute
//     façon les trois (cat, couleur, nœud) au chargement. Reloger COHÉREMMENT une de ces cartes dans une
//     autre section passe donc ici : le défaut n'existe que sans JavaScript, comme le « (N) » ci-dessus.
//     Retoucher un SEUL des trois reste vu (contradiction interne), et une carte SANS entrée MOVES est
//     jugée sur son `data-cat` comme avant. Fermer ce dernier trou demanderait d'attester l'origine du
//     déplacement (`{nom: {de, vers}}`) : coût réel, pour un défaut invisible au visiteur.
//   • Le niveau d'accès EFFECTIF sur un serveur donné : `+customperm` peut surcharger le palier
//     serveur par serveur, et un Administrateur Discord passe partout (`canUse` court-circuite sur
//     `Administrator`). Le badge annonce le palier PAR DÉFAUT du bot, pas l'état d'un serveur — et
//     pour les quatre commandes `LEVEL_OVERRIDE = 3` sans `ownerOnly` (`antiraid`, `backup`,
//     `lockdown`, `punish`) il est donc CONSERVATEUR : il annonce owner alors qu'un Administrateur
//     Discord passerait. Se tromper dans ce sens ne promet pas un levier qu'on n'a pas.
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
const vm = require('vm');
const Module = require('module');
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

// Le badge VISIBLE d'une carte, tel que le générateur le pose :
//   <span class="accb acc-admin" data-i18n="accAdmin">🛡️ Admin</span>
// Trois informations qui doivent dire la MÊME chose que `data-acc` : la classe (elle donne la
// couleur), la clé i18n (elle donne le texte après changement de langue), et le texte lui-même
// (c'est ce que lit le visiteur tant qu'applyLang n'est pas passé).
const RX_BADGE = /<span class="accb acc-([a-z]+)" data-i18n="(acc[A-Za-z]+)">([^<]*)<\/span>/;
const ACCK = { owner: 'accOwner', admin: 'accAdmin', staff: 'accStaff', all: 'accAll' };

// La SECTION de catégorie qui contient physiquement une carte : <section id="c3" style="--cc:#E91E63">.
// C'est ce que voit l'ŒIL (le titre au-dessus, la couleur d'accent héritée) ; `data-cat`, lui, pilote
// les puces de filtre `.navf[data-cat]` et les compteurs. Même partage que `data-acc` et le badge
// `.accb`, donc même exigence : les deux doivent désigner la même catégorie.
const RX_SECTION = /<section id="c(\d+)"([^>]*)>/g;

// La table `MOVES` du script inline : la recatégorisation que le site applique AU CHARGEMENT, après
// coup, sur des cartes déjà écrites. Elle contredit commands/help.js par construction — c'est sa raison
// d'être — donc on ne la compare pas à help.js : on l'ATTESTE. Cf. l'en-tête, « LE POINT DUR ».
const RX_MOVES = /var\s+MOVES\s*=\s*\{([^}]*)\}\s*;/;

function cartesDe(html) {
  const noms = [];
  const detail = [];
  let balises = 0, sansNom = 0;
  RX_CARTE.lastIndex = 0;
  let m;
  const bornes = [];
  while ((m = RX_CARTE.exec(html))) bornes.push({ tag: m[0], index: m.index });
  // Les sections de catégorie, dans l'ordre du fichier. docs-build.js écrit `<section id="cN">` et
  // `data-cat="N"` dans le MÊME `map`, avec le même `i` : dans un fichier généré, la section qui
  // contient une carte EST sa catégorie. Toute divergence est donc une retouche à la main.
  RX_SECTION.lastIndex = 0;
  const sections = [];
  let s;
  while ((s = RX_SECTION.exec(html))) sections.push({ idx: Number(s[1]), index: s.index, cc: ((s[2].match(/--cc:\s*([^;"]+)/) || [])[1] || '').trim() });
  // Section CONTENANTE d'une position : la dernière ouverte avant elle. Les sections de docs-build sont
  // sœurs et jamais imbriquées, donc « la dernière ouverte » est exact. Une carte écrite AVANT la
  // première section rend `null` — un signal, pas un repli silencieux.
  const sectionDe = (pos) => { let trouvee = null; for (const x of sections) { if (x.index < pos) trouvee = x; else break; } return trouvee; };
  for (let i = 0; i < bornes.length; i++) {
    balises++;
    const b = bornes[i];
    const t = b.tag.match(/data-n="([^"]*)"/);
    if (t) noms.push(t[1]); else { sansNom++; continue; }
    // Le badge est cherché DANS la carte courante seulement : borné par le début de la carte
    // suivante. Sans cette borne, une carte sans badge « emprunterait » celui de sa voisine et le
    // contrôle deviendrait creux exactement là où il doit mordre.
    const fin = i + 1 < bornes.length ? bornes[i + 1].index : html.length;
    const seg = html.slice(b.index + b.tag.length, fin);
    const badge = seg.match(RX_BADGE);
    const sec = sectionDe(b.index);
    detail.push({
      nom: t[1],
      acc: (b.tag.match(/data-acc="([^"]*)"/) || [])[1] || null,
      cat: (b.tag.match(/data-cat="([^"]*)"/) || [])[1] || null,
      couleur: (b.tag.match(/data-c="([^"]*)"/) || [])[1] || null,
      section: sec ? sec.idx : null,
      sectionCouleur: sec ? sec.cc : null,
      badgeClasse: badge ? badge[1] : null,
      badgeCle: badge ? badge[2] : null,
      badgeTexte: badge ? badge[3] : null,
    });
  }
  return { noms, balises, sansNom, detail, sections };
}

// Les quatre libellés de niveau d'accès, RELUS DANS LA PAGE (dictionnaire du script inline) plutôt
// que recopiés ici : si le site renomme « 👥 Tous », le garde suit au lieu de rougir à tort.
function libellesAcces(html) {
  const out = {};
  for (const [tier, cle] of Object.entries(ACCK)) {
    const m = html.match(new RegExp(cle + ":\\{fr:'((?:[^'\\\\]|\\\\.)*)'"));
    if (!m) return null;
    out[tier] = m[1].replace(/\\'/g, "'");
  }
  return out;
}

// Le repère de fraîcheur : la date de publication du changelog affichée par la page. C'est le seul
// endroit d'index.html qui bouge à CHAQUE version du bot, et c'est aussi le seul moment où les
// commandes changent. On s'y accroche.
function dateChangelog(html) {
  const m = html.match(/<div class="ver">([\s\S]*?)<\/div>/);
  if (!m) return null;
  return m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Lecture de la table MOVES. TROIS issues, distinctes exprès :
//   {}    → aucun déplacement déclaré. C'est l'état NORMAL une fois que help.js range tout lui-même
//           (le site l'écrit : « No-op automatique quand le bot rangera ces commandes »). Pas une anomalie.
//   objet → les déplacements lus : nom → index de destination.
//   null  → `var MOVES={…}` est bien là, mais aucune paire n'a pu en être lue. Le navigateur, lui,
//           continue de déplacer : croire « aucun déplacement » serait valider une page qu'on ne
//           comprend plus. Panne nommée, pas silence.
function deplacementsDuSite(html) {
  const m = html.match(RX_MOVES);
  if (!m) return {};
  const out = {};
  for (const p of m[1].matchAll(/(\w+)\s*:\s*'(\d+)'/g)) out[p[1]] = Number(p[2]);
  return Object.keys(out).length ? out : null;
}

// Signature stable d'une table de déplacements : comparer le LU et l'ATTESTÉ sans dépendre de l'ordre
// des clés ni du type (le site écrit '5', le manifeste 5).
const signatureDeplacements = (o) => Object.keys(o || {}).sort().map((n) => n + '→c' + Number(o[n])).join(' ') || '(aucun)';

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
// LA PORTE RÉELLE D'UNE COMMANDE — exécutée, pas recopiée.
//
// `systems/permissions.js` du bot est évalué TEL QUEL dans un bac à sable : ses quatre tables
// (`PUBLIC`, `JEUX_PUBLICS`, `COMMAND_PERMS`, `LEVEL_OVERRIDE`) et sa fonction `commandLevel` sont
// donc lues à la source. Recopier ces tables ici, c'est exactement le défaut qu'on répare :
// docs-build.js avait recopié la moitié d'une règle et publiait un badge faux depuis des mois.
//
// `./database` et `./owners` sont stubés : le premier ouvrirait la base SQLite du bot (ce garde ne
// doit RIEN toucher dans le dépôt du bot), le second n'intervient qu'à l'exécution d'une commande.
// Tout autre `require` inattendu LÈVE : si permissions.js change de dépendances, on l'apprend par un
// échec nommé, jamais par un badge silencieusement faux.
const RANG_ACCES = { all: 0, staff: 1, admin: 2, owner: 3 };
const TIER_PAR_NIVEAU = { 3: 'owner', 2: 'admin', 1: 'staff', 0: 'all' };
// Seule règle RECOPIÉE depuis le répartiteur — donc assertée mot pour mot dans index.js ci-dessous.
const MOTIF_PORTE_OWNER = "commandName === 'nuke' || commandName === 'addrole' || commandName === 'delrole'";
const PORTE_OWNER_REPARTITEUR = ['nuke', 'addrole', 'delrole'];

function paliersDuBot(racineBot) {
  // `path.resolve` et non `path.join` : createRequire exige un chemin ABSOLU, et `--bot ..` en donne
  // un relatif. Sans ça le garde plante au lieu d'attester — un garde qui plante ne dit rien.
  const fichier = path.resolve(racineBot, 'systems', 'permissions.js');
  if (!fs.existsSync(fichier)) throw new Error('systems/permissions.js introuvable dans le dépôt du bot — impossible d\'attester le niveau d\'accès des cartes.');
  const req = Module.createRequire(fichier);
  const faux = (id) => {
    if (id === './database') return { getJSON: () => ({}) };          // jamais de base ouverte
    if (id === './owners') return { isBotOwner: () => false, isGuildOwner: () => false };
    if (id === 'discord.js' || id === './gamehub') return req(id);     // vrais modules, sans effet de bord
    throw new Error('systems/permissions.js require désormais « ' + id + ' » : ce bac à sable ne le connaît pas. Complète-le avant d\'attester.');
  };
  const mod = { exports: {} };
  vm.runInNewContext(fs.readFileSync(fichier, 'utf8'), { require: faux, module: mod, exports: mod.exports, console, process });
  if (typeof mod.exports.commandLevel !== 'function') throw new Error('systems/permissions.js n\'exporte plus `commandLevel` — la règle du badge a changé de forme, adapte ce garde.');

  const idx = path.join(racineBot, 'index.js');
  if (!fs.existsSync(idx)) throw new Error('index.js introuvable dans le dépôt du bot — la branche owner du répartiteur ne peut pas être vérifiée.');
  if (!fs.readFileSync(idx, 'utf8').includes(MOTIF_PORTE_OWNER)) {
    throw new Error('la branche « ' + MOTIF_PORTE_OWNER + ' » a disparu d\'index.js : +nuke/+addrole/+delrole n\'ont peut-être plus la porte owner que les cartes annoncent. Relis le répartiteur et corrige PORTE_OWNER_REPARTITEUR avant d\'attester.');
  }
  return mod.exports.commandLevel;
}

// LA CATÉGORIE D'UNE COMMANDE — lue à la source, et son INDEX recalculé par la règle du générateur.
//
// `commands/help.js` porte la table `CATEGORIES`. Ce n'est pas un rangement d'affichage : `systems/
// permissions.js` require ce même fichier et ferme TOUS les noms de « 🛡️ Sécurité & Antiraid » et
// « 👑 Owner du bot » (`CATEGORIES_FERMEES`) — 89 commandes qu'aucun `+customperm` ne rouvre. Une carte
// mal rangée ne se contente pas de mal s'afficher : elle raconte la mauvaise porte.
//
// L'INDEX 0..6 n'est écrit NULLE PART dans help.js. Il naît de la règle de tools/docs-build.js:119-130,
// rejouée ici à l'identique. Recopier une numérotation à la main, c'est le défaut réparé le 30/08 sur
// les badges d'accès. Le bloc est extrait par le MÊME motif que docs-build.js puis évalué comme littéral
// statique de notre propre code — dans un contexte `vm` plutôt qu'avec `eval`, seule différence.
const CAT_ORDER_DOCS_BUILD = ['Sécurité & Antiraid', 'Configuration', 'Owner du bot', 'Modération', 'Automod', 'Général', 'Niveaux', 'Communauté', 'Fun', 'Autres'];

function categoriesDuBot(racineBot, vivantes) {
  const fichier = path.resolve(racineBot, 'commands', 'help.js');
  if (!fs.existsSync(fichier)) throw new Error('commands/help.js introuvable dans le dépôt du bot — impossible d\'attester la catégorie des cartes.');
  const bloc = (fs.readFileSync(fichier, 'utf8').match(/const CATEGORIES = (\{[\s\S]*?\n\});/) || [])[1];
  if (!bloc) throw new Error('la table « const CATEGORIES = {…}; » a changé de forme dans commands/help.js : tools/docs-build.js ne la lira plus non plus (il l\'extrait avec le MÊME motif, et le site retomberait à une seule carte). Adapte les deux avant d\'attester.');
  let CATEGORIES;
  try { CATEGORIES = vm.runInNewContext('(' + bloc + ')'); }
  catch (e) { throw new Error('la table CATEGORIES de commands/help.js ne s\'évalue plus comme un littéral statique (' + e.message + ') — un appel de fonction en position de clé ferait planter tools/docs-build.js de la même façon.'); }

  // ── Rejeu EXACT de tools/docs-build.js:119-130 : ordre d'insertion, catégories vides écartées,
  //    « Autres » en queue, puis le tri par CAT_ORDER.
  const connues = new Set(vivantes);
  const used = new Set();
  const sections = [];
  for (const [cat, noms] of Object.entries(CATEGORIES)) {
    const list = noms.filter((n) => connues.has(n));
    for (const n of list) used.add(n);
    if (list.length) sections.push({ cat, list });
  }
  const autres = vivantes.filter((n) => !used.has(n));
  if (autres.length) sections.push({ cat: 'Autres', list: autres });
  sections.sort((a, b) => { const ia = CAT_ORDER_DOCS_BUILD.indexOf(a.cat), ib = CAT_ORDER_DOCS_BUILD.indexOf(b.cat); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });

  // ── Planchers de plausibilité — même rôle que `maigres` pour les paliers : transformer une panne
  //    silencieuse en échec nommé, plutôt qu'attester une numérotation qu'on n'a pas calculée.
  if (sections.length < 5) {
    throw new Error('seulement ' + sections.length + ' catégorie(s) extraites de commands/help.js — la table n\'a pas été lue telle qu\'elle est. On n\'atteste pas une catégorie qu\'on n\'a pas vraiment calculée.');
  }
  if (autres.length) {
    throw new Error(autres.length + ' commande(s) documentables ne sont dans AUCUNE catégorie de commands/help.js : '
      + autres.slice(0, 12).map((n) => '+' + n).join(' ') + (autres.length > 12 ? ' …' : '')
      + '. tools/docs-build.js les rangerait dans « Autres » — or « Autres » est le SEUL nom encore reconnu par son CAT_ORDER (les sept autres ont pris un emoji et n\'y sont plus trouvés), donc le tri le remonterait EN TÊTE : la section c0 deviendrait « Autres » et les sept index glisseraient d\'un cran, invalidant d\'un coup les ' + vivantes.length + ' `data-cat` de la page. Range-les dans help.js avant d\'attester.');
  }

  const index = {};
  sections.forEach((s, i) => { for (const n of s.list) index[n] = i; });
  const sansIndex = vivantes.filter((n) => !Number.isInteger(index[n]));
  if (sansIndex.length) throw new Error(sansIndex.length + ' commande(s) sans index de catégorie après le rejeu de docs-build.js (' + sansIndex.slice(0, 8).map((n) => '+' + n).join(' ') + ') — la règle d\'ordre a divergé, adapte categoriesDuBot() avant d\'attester.');
  return { index, ordre: sections.map((s) => s.cat) };
}

function commandesDuBot(racineBot) {
  const CMD = path.join(racineBot, 'commands');
  if (!fs.existsSync(CMD)) throw new Error('« ' + racineBot + ' » ne contient pas commands/ — ce n\'est pas la racine du dépôt du bot.');
  let FR = {};
  try { FR = JSON.parse(fs.readFileSync(path.join(racineBot, 'i18n', 'fr.json'), 'utf8')); } catch (e) { throw new Error('i18n/fr.json illisible dans le dépôt du bot : ' + e.message); }

  const vivantes = [];
  const muettes = [];       // un nom, mais aucune description → volontairement non documentées
  const sansMetadonnees = []; // pas de `name:` littéral → ce n'est pas un module de commande
  const ownerOnly = new Set(); // `ownerOnly: true` → le répartiteur refuse AVANT d'appeler canUse

  for (const f of fs.readdirSync(CMD).filter((x) => x.endsWith('.js') && x !== 'help.js')) {
    const full = fs.readFileSync(path.join(CMD, f), 'utf8');
    const ix = full.indexOf('module.exports');
    let src = ix >= 0 ? full.slice(ix) : full;
    let nom = (src.match(/name:\s*'([^']+)'/) || [])[1];
    if (!nom) { src = full; nom = (full.match(/name:\s*'([^']+)'/) || [])[1]; }
    if (!nom) { sansMetadonnees.push({ fichier: f, raison: 'aucun `name:` littéral — module utilitaire, pas une commande' }); continue; }
    const descKey = (src.match(/descKey:[ ]*'([^']+)'/) || [])[1];
    const desc = descKey ? String(FR[descKey] || '') : (src.match(/description:\s*'((?:[^'\\]|\\.)*)'/) || [])[1];
    if (/ownerOnly:\s*true/.test(src)) ownerOnly.add(nom);
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

  // ── LE NIVEAU D'ACCÈS RÉEL, commande par commande.
  const commandLevel = paliersDuBot(racineBot);
  const acces = {};
  for (const n of vivantes) {
    let tier = ownerOnly.has(n) ? 'owner' : (TIER_PAR_NIVEAU[commandLevel(n)] || null);
    if (!tier) throw new Error('commandLevel(\'' + n + '\') a rendu une valeur hors des paliers 0/1/2/3 — la règle du bot a changé, adapte ce garde avant d\'attester.');
    if (PORTE_OWNER_REPARTITEUR.includes(n) && RANG_ACCES[tier] < RANG_ACCES.owner) tier = 'owner';
    acces[n] = tier;
  }
  // `help` est posé à la main par docs-build (il décrit les autres) : il n'a pas de fichier, donc pas
  // de `ownerOnly`, et `commandLevel` le classe déjà public via PUBLIC. On vérifie plutôt qu'on ne
  // l'annonce pas privilégié par accident.
  if (acces.help !== 'all') throw new Error('+help n\'est plus classé « tous » (' + acces.help + ') — vérifie PUBLIC dans systems/permissions.js avant d\'attester.');

  // Plancher de plausibilité — le même garde-fou que RX_CARTE, pour la même raison. Si le bac à
  // sable rendait des tables VIDES, `commandLevel` renverrait 2 pour tout le monde : 238 cartes
  // « admin », zéro divergence, et un garde qui a l'air content. Les quatre paliers doivent exister
  // et aucun ne doit être anecdotique.
  const parTier = {};
  for (const t of Object.values(acces)) parTier[t] = (parTier[t] || 0) + 1;
  const maigres = Object.keys(RANG_ACCES).filter((t) => (parTier[t] || 0) < 3);
  if (maigres.length) {
    throw new Error('répartition des paliers implausible (' + JSON.stringify(parTier) + ') : ' + maigres.join(', ')
      + ' compte(nt) moins de 3 commandes. Les tables de systems/permissions.js n\'ont probablement pas été lues — on n\'atteste pas un niveau d\'accès qu\'on n\'a pas vraiment calculé.');
  }

  // ── LA CATÉGORIE, commande par commande, et l'ORDRE des sections qui lui donne son index.
  const { index: categories, ordre: ordreCategories } = categoriesDuBot(racineBot, vivantes);

  return { vivantes, muettes, sansMetadonnees, compteGenerateur, acces, categories, ordreCategories };
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
  const { noms, balises, sansNom, detail, sections } = cartesDe(html);

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
  // — Même plancher, pour les sections. Sans elles, `section` vaut `null` sur toutes les cartes et le
  //   contrôle de catégorie bascule soit en centaines de reproches, soit — pire — en silence.
  if (sections.length < 3) {
    ko('Le motif de reconnaissance des sections de catégorie ne reconnaît plus la page',
      sections.length + ' balise(s) <section id="cN"> trouvée(s) — le catalogue en compte une par catégorie.',
      'Soit les sections ont changé de balisage, soit elles ont disparu : adapte RX_SECTION dans .github/check-commands.js.',
      'Tant que ce point est rouge, le contrôle des catégories ne vaut rien.');
  }
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

    // ── Maillon (3 bis) : LE NIVEAU D'ACCÈS ANNONCÉ PAR CHAQUE CARTE.
    //   Le badge dit au visiteur QUI PEUT LANCER la commande. Faux dans un sens, un membre essaie et
    //   se fait refuser ; faux dans l'autre, un administrateur croit tenir un levier qu'il n'a pas.
    const acces = man.acces;
    if (!acces || typeof acces !== 'object') {
      ko('Le manifeste n\'atteste AUCUN niveau d\'accès',
        'Ce manifeste est antérieur au contrôle des badges (`acces` absent). Le laisser passer rendrait ce contrôle INERTE — précisément le défaut qu\'il ferme.',
        'Ré-atteste : node .github/check-commands.js --bot .. --write');
    } else {
      const sansPalier = attendues.filter((n) => !acces[n]);
      const enTrop = Object.keys(acces).filter((n) => !attendues.includes(n));
      if (sansPalier.length || enTrop.length) {
        ko('Manifeste incohérent avec lui-même (niveaux d\'accès)',
          ...(sansPalier.length ? ['  ✗ ' + sansPalier.length + ' commande(s) sans palier attesté : ' + sansPalier.slice(0, 12).map((n) => '+' + n).join(' ')] : []),
          ...(enTrop.length ? ['  ✗ ' + enTrop.length + ' palier(s) pour une commande absente de la liste : ' + enTrop.slice(0, 12).map((n) => '+' + n).join(' ')] : []),
          'Un manifeste retouché à la main ne prouve plus rien : ré-atteste-le depuis le dépôt du bot.');
      }

      const LBL = libellesAcces(html);
      if (!LBL) {
        ko('Les libellés de niveau d\'accès ont disparu du dictionnaire de la page',
          'Aucun `accOwner:{fr:…}` / `accAdmin` / `accStaff` / `accAll` dans index.html : impossible de vérifier que le TEXTE du badge dit la même chose que sa classe.',
          'Répare le dictionnaire du script inline, ou change d\'ancre dans .github/check-commands.js — mais ne la retire pas sans la remplacer.');
      }

      const menteurs = [];   // le badge annonce un palier ≠ de la porte réelle
      const bancals = [];    // data-acc, classe, clé i18n et texte ne disent pas tous la même chose
      for (const c of detail) {
        const vrai = acces[c.nom];
        if (!vrai) continue;                       // commande hors manifeste : déjà signalée plus haut
        if (!c.badgeClasse) { bancals.push('  ✗ +' + c.nom + ' — aucun badge <span class="accb …"> dans la carte'); continue; }
        const coherente = c.acc === c.badgeClasse && ACCK[c.acc] === c.badgeCle
          && (!LBL || c.badgeTexte === LBL[c.acc]);
        if (!coherente) {
          bancals.push('  ✗ +' + c.nom + ' — data-acc="' + c.acc + '", classe acc-' + c.badgeClasse
            + ', clé ' + c.badgeCle + ', texte « ' + c.badgeTexte + ' »' + (LBL ? ' (attendu « ' + LBL[c.acc] + ' »)' : ''));
        } else if (c.acc !== vrai) {
          menteurs.push('  ✗ +' + c.nom + ' — la carte annonce « ' + (LBL ? LBL[c.acc] : c.acc) + ' », la porte réelle est « ' + (LBL ? LBL[vrai] : vrai) + ' » (' + c.acc + ' → ' + vrai + ')');
        }
      }
      if (bancals.length) {
        ko(bancals.length + ' carte(s) dont le badge se contredit LUI-MÊME',
          ...bancals.slice(0, 40),
          ...(bancals.length > 40 ? ['  … et ' + (bancals.length - 40) + ' autre(s)'] : []),
          'La classe donne la couleur, la clé i18n donne le texte après changement de langue, `data-acc` pilote les puces de filtre : les quatre doivent dire la même chose, sinon le filtre et l\'œil racontent deux histoires.');
      }
      if (menteurs.length) {
        ko(menteurs.length + ' carte(s) annoncent un NIVEAU D\'ACCÈS FAUX',
          ...menteurs.slice(0, 40),
          ...(menteurs.length > 40 ? ['  … et ' + (menteurs.length - 40) + ' autre(s)'] : []),
          'Le badge dit qui peut lancer la commande. Annoncer « 👥 Tous » sur une commande d\'admin fait essayer un membre pour rien ;',
          'annoncer « 🛡️ Admin » sur une commande d\'owner fait croire à un administrateur qu\'il tient un levier — au mauvais moment.',
          'Le palier attesté vient de systems/permissions.js (commandLevel + LEVEL_OVERRIDE), des `ownerOnly` de commands/, et de la branche owner du répartiteur.');
      }
    }

    // ── Maillon (3 ter) : LA CATÉGORIE DE CHAQUE CARTE.
    //   Trois choses doivent s'accorder, et aucune n'était regardée : la catégorie ATTESTÉE (celle de
    //   commands/help.js, index recalculé par la règle de docs-build.js), l'attribut `data-cat` (puces
    //   de filtre et compteurs), et la `<section id="cN">` qui contient PHYSIQUEMENT la carte (le titre
    //   sous lequel l'œil la trouve, et la couleur d'accent qu'elle en hérite).
    //   Pour la table MOVES et le choix qu'elle impose, voir « LE POINT DUR » dans l'en-tête.
    const cats = man.categories;
    if (!cats || typeof cats !== 'object') {
      ko('Le manifeste n\'atteste AUCUNE catégorie',
        'Ce manifeste est antérieur au contrôle des catégories (`categories` absent). Le laisser passer rendrait ce contrôle INERTE — précisément le défaut qu\'il ferme.',
        'Ré-atteste : node .github/check-commands.js --bot .. --write');
    } else {
      const ordreCat = Array.isArray(att.ordreCategories) ? att.ordreCategories : null;
      const nomCat = (i) => (ordreCat && ordreCat[i] ? '« ' + ordreCat[i] + ' » (c' + i + ')' : 'c' + i);

      const sansCat = attendues.filter((n) => !Number.isInteger(cats[n]));
      const catEnTrop = Object.keys(cats).filter((n) => !attendues.includes(n));
      if (sansCat.length || catEnTrop.length) {
        ko('Manifeste incohérent avec lui-même (catégories)',
          ...(sansCat.length ? ['  ✗ ' + sansCat.length + ' commande(s) sans catégorie attestée : ' + sansCat.slice(0, 12).map((n) => '+' + n).join(' ')] : []),
          ...(catEnTrop.length ? ['  ✗ ' + catEnTrop.length + ' catégorie(s) pour une commande absente de la liste : ' + catEnTrop.slice(0, 12).map((n) => '+' + n).join(' ')] : []),
          'Un manifeste retouché à la main ne prouve plus rien : ré-atteste-le depuis le dépôt du bot.');
      }

      // ── La table MOVES : lue dans la page, confrontée à l'attestation, et tenue de rester UTILE.
      const mvLus = deplacementsDuSite(html);
      const mvAtt = (att.deplacementsDuSite && typeof att.deplacementsDuSite === 'object') ? att.deplacementsDuSite : {};
      if (mvLus === null) {
        ko('La table MOVES du site est présente mais ILLISIBLE',
          'Un `var MOVES={…}` est bien dans index.html, mais aucune paire nom/index n\'a pu en être lue.',
          'Le navigateur, lui, continue de déplacer des cartes : ce garde croirait « aucun déplacement » et validerait une page qu\'il ne comprend plus.',
          'Adapte RX_MOVES dans .github/check-commands.js, ou répare la table.');
      } else {
        if (signatureDeplacements(mvLus) !== signatureDeplacements(mvAtt)) {
          ko('La recatégorisation appliquée par le site a changé sans ré-attestation',
            'index.html applique : ' + signatureDeplacements(mvLus),
            'le manifeste atteste  : ' + signatureDeplacements(mvAtt),
            'MOVES change la catégorie que voit le VISITEUR sans toucher à `data-cat`. La modifier sans rouvrir commands/help.js,',
            'c\'est la dérive du 11/08/2026 refaite : ré-atteste — ou mieux, range la commande dans help.js et supprime le déplacement.',
            '  node .github/check-commands.js --bot .. --write');
        }
        for (const [n, vers] of Object.entries(mvLus)) {
          const c = detail.find((x) => x.nom === n);
          if (!c) {
            ko('Déplacement FANTÔME : MOVES déplace +' + n + ', qui n\'a aucune carte',
              'Le script tourne dans le vide à chaque chargement. C\'est le défaut de la liste d\'exclusions par noms de cmdtests.js :',
              'elle ne se plaint pas quand sa cible disparaît, puis agit sur autre chose le jour où le nom revit.');
          } else if (Number(c.cat) === vers) {
            ko('Déplacement MORT : MOVES envoie +' + n + ' vers ' + nomCat(vers) + ', où la carte est DÉJÀ',
              'Le site l\'annonce lui-même : « No-op automatique quand le bot rangera ces commandes ». C\'est fait — retire l\'entrée de MOVES',
              'et ré-atteste, sinon la liste des exceptions grossit et plus personne ne sait lesquelles servent encore.');
          }
          if (!sections.some((x) => x.idx === vers)) {
            ko('Déplacement IMPOSSIBLE : MOVES envoie +' + n + ' vers c' + vers + ', section absente de la page',
              'Le script sort sur son `if(!grid)return` : la carte reste où elle est, en silence, et le visiteur voit une catégorie que personne n\'a voulue.');
          }
        }
      }

      const mauvaises = [];   // help.js ≠ ce que le générateur a écrit
      const bancalesCat = []; // `data-cat`, section physique et couleur ne disent pas tous la même chose
      for (const c of detail) {
        const vraie = cats[c.nom];
        // ── LE CRÉDIT DE MOVES. La catégorie EFFECTIVE d'une carte n'est pas `data-cat` : c'est celle
        //    que voit le VISITEUR une fois le script de recatégorisation passé (il réécrit `dataset.cat`,
        //    réaligne `data-c` sur le `--cc` d'arrivée et déplace le nœud). MOVES existe pour COMPENSER un
        //    `data-cat` périmé pendant que commands/help.js, lui, a déjà rangé la commande ailleurs :
        //    confronter `data-cat` BRUT à help.js rougissait donc les cartes que MOVES met précisément
        //    D'ACCORD avec help.js — un rouge à perpétuité que personne ne peut éteindre, donc un garde mort.
        //    Le déplacement n'est crédité que s'il a lieu POUR DE VRAI : le script sort sur son `if(!grid)return`
        //    quand la section de destination manque, et la carte reste alors sur son `data-cat`.
        const dest = (mvLus && Object.prototype.hasOwnProperty.call(mvLus, c.nom)) ? mvLus[c.nom] : null;
        const deplacee = dest !== null && sections.some((x) => x.idx === dest);
        const catEff = deplacee ? dest : Number(c.cat);
        if (!Number.isInteger(vraie)) continue;      // commande hors manifeste : déjà signalée plus haut
        if (c.cat === null) { bancalesCat.push('  ✗ +' + c.nom + ' — aucun attribut data-cat : la carte échappe à toutes les puces de filtre'); continue; }
        if (c.section === null) { bancalesCat.push('  ✗ +' + c.nom + ' — carte écrite en dehors de toute <section id="cN"> : elle s\'affiche sans titre de catégorie'); continue; }
        if (Number(c.cat) !== c.section) {
          bancalesCat.push('  ✗ +' + c.nom + ' — data-cat="' + c.cat + '" (' + nomCat(Number(c.cat)) + ') mais la carte est écrite dans c' + c.section + ' (' + nomCat(c.section) + ')');
        } else if (c.couleur && c.sectionCouleur && c.couleur !== c.sectionCouleur) {
          bancalesCat.push('  ✗ +' + c.nom + ' — data-c="' + c.couleur + '" alors que ' + nomCat(c.section) + ' porte --cc:' + c.sectionCouleur);
        } else if (catEff !== vraie) {
          mauvaises.push('  ✗ +' + c.nom + ' — ' + (deplacee ? 'MOVES la range dans ' + nomCat(catEff) + ' (data-cat="' + c.cat + '")' : 'la carte la range dans ' + nomCat(catEff)) + ', commands/help.js la range dans ' + nomCat(vraie));
        }
      }
      if (bancalesCat.length) {
        ko(bancalesCat.length + ' carte(s) dont la catégorie se contredit ELLE-MÊME',
          ...bancalesCat.slice(0, 40),
          ...(bancalesCat.length > 40 ? ['  … et ' + (bancalesCat.length - 40) + ' autre(s)'] : []),
          '`data-cat` pilote les puces de filtre et les compteurs, la <section> donne le titre et la couleur d\'accent :',
          'une carte dont les deux divergent s\'affiche sous un titre et disparaît quand on clique sur ce même titre.');
      }
      if (mauvaises.length) {
        ko(mauvaises.length + ' carte(s) sont rangées dans une CATÉGORIE FAUSSE',
          ...mauvaises.slice(0, 40),
          ...(mauvaises.length > 40 ? ['  … et ' + (mauvaises.length - 40) + ' autre(s)'] : []),
          'La catégorie n\'est pas un rangement d\'affichage : systems/permissions.js require commands/help.js et ferme TOUS les noms de',
          '« Sécurité & Antiraid » et « Owner du bot » — 89 commandes qu\'aucun +customperm ne peut rouvrir. Sortir une carte de ces deux',
          'catégories laisse croire qu\'on peut en déléguer l\'accès ; l\'y faire entrer promet un verrou qui n\'existe pas.',
          'Si le déplacement est VOULU côté site, il passe par la table MOVES d\'index.html — elle est CRÉDITÉE ici : une carte',
          'que MOVES range là où help.js la range est acceptée, `data-cat` périmé compris. Mais MOVES n\'ACHÈTE pas une',
          'catégorie que help.js refuse : ici, ré-attester la table ne suffit pas — il faut rouvrir commands/help.js.');
      }
    }

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
    const rep = {}; for (const t of Object.values(b.acces)) rep[t] = (rep[t] || 0) + 1;
    console.log('   (local) dépôt du bot lu : ' + b.vivantes.length + ' commandes documentables, ' + b.muettes.length + ' muettes, ' + b.sansMetadonnees.length + ' fichier(s) hors catalogue. Compte confirmé par tools/docs-build.js.');
    console.log('   (local) portes réelles (systems/permissions.js exécuté, `ownerOnly` relus, branche owner du répartiteur assertée) : '
      + ['owner', 'admin', 'staff', 'all'].map((t) => (rep[t] || 0) + ' ' + t).join(' · ') + '.');
    console.log('   (local) catégories (table CATEGORIES de commands/help.js, ordre rejoué depuis tools/docs-build.js) : '
      + b.ordreCategories.map((c, i) => 'c' + i + ' ' + c).join(' · ') + '.');
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
      // La table MOVES est SITE-side : elle vit dans ce dépôt, mais on la fige au moment de
      // l'attestation pour qu'on ne puisse pas en ajouter une sans rouvrir le dépôt du bot.
      const mvEcrire = deplacementsDuSite(html);
      if (mvEcrire === null) throw new Error('la table MOVES d\'index.html est présente mais illisible (RX_MOVES n\'y trouve aucune paire) : on n\'atteste pas une recatégorisation qu\'on ne sait pas lire.');
      const contenu = {
        _lisezMoi: 'Manifeste ATTESTÉ des commandes du bot Hasu Protect. Produit UNIQUEMENT par « node .github/check-commands.js --bot <racine du bot> --write », qui lit réellement commands/ et croise son compte avec tools/docs-build.js. Ne le retouche pas à la main : le contrôle .github/check-commands.js compare `commandes.length` à `attestation.nombre` et à stats.json, et une retouche se voit.',
        attestation: {
          attesteLe: new Date().toISOString(),
          source: 'commands/*.js + i18n/fr.json du dépôt du bot, règles d\'extraction de tools/docs-build.js',
          compteConfirmeParLeGenerateur: b.compteGenerateur,
          changelogDuSite: dateChangelog(html),
          // L'ORDRE des sections au moment de l'attestation : il donne un NOM aux index 0..6 dans les
          // messages d'erreur, et un renumérotage devient visible dans le diff du manifeste.
          ordreCategories: b.ordreCategories,
          // La recatégorisation appliquée par le site AU CHARGEMENT, figée ici. C'est la seule table
          // autorisée à contredire help.js ; l'attester rend impossible d'en ajouter une en silence.
          deplacementsDuSite: mvEcrire,
          nombre: b.vivantes.length,
        },
        commandes: b.vivantes,
        // Niveau d'accès RÉEL, calculé en exécutant systems/permissions.js du bot (jamais recopié) :
        // owner · admin · staff · all. C'est ce que le badge de chaque carte doit annoncer.
        acces: b.acces,
        // Catégorie RÉELLE (index 0..6), obtenue en rejouant la règle d'ordre de tools/docs-build.js sur
        // la table CATEGORIES de commands/help.js. C'est ce que `data-cat` et la <section id="cN"> de
        // chaque carte doivent dire — la catégorie n'étant pas un rangement mais la liste dont
        // systems/permissions.js se sert pour fermer 89 commandes.
        categories: b.categories,
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
    console.log('✅ Catalogue : ' + r.cartes.length + ' cartes, une par commande du manifeste attesté, la page annonce le même chiffre,');
    console.log('   chaque carte annonce le niveau d\'accès RÉEL de sa commande (data-acc + badge visible),');
    console.log('   et sa catégorie RÉELLE (data-cat + <section id="cN">), aux déplacements MOVES attestés près.');
    return 0;
  }
  console.error('❌ LE SITE NE DIT PAS LA VÉRITÉ SUR LES COMMANDES DU BOT — ' + r.erreurs.length + ' point(s) :');
  for (const e of r.erreurs) {
    console.error('\n• ' + e.titre);
    for (const l of e.lignes) console.error('  ' + l);
  }
  console.error('\nRappel : ce contrôle juge l\'ENSEMBLE DES NOMS, le NIVEAU D\'ACCÈS et la CATÉGORIE (data-cat, section');
  console.error('physique, table MOVES attestée). Le reste du contenu des cartes (usage, description, alias, traduction EN)');
  console.error('n\'est couvert par aucun garde de ce dépôt.');
  return 1;
}

module.exports = { cartesDe, libellesAcces, zoneProse, promessesChiffrees, dateChangelog, deplacementsDuSite, paliersDuBot, categoriesDuBot, commandesDuBot, verifier, main };

if (require.main === module) process.exit(main(process.argv.slice(2)));
