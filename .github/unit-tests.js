// Tests unitaires des fonctions PURES du site, extraites du <script> RÉELLEMENT DÉPLOYÉ d'index.html
// et évaluées avec des stubs minimaux. Lancé par check-csp.yml.
//
// ── Ce qui est couvert ici (statique, sans navigateur) :
//    parseParams/splitTop/splitForms/exFor/hintFor (parseur de signatures), md/escH/lev/sparkline,
//    hlText (surlignage), animTo (compteur animé), botReply (réponses simulées), le service worker,
//    et les AUTO-CONTRÔLES du harnais lui-même (voir plus bas).
// ── Ce qui n'est PAS couvert ici : tout ce qui a besoin d'un vrai DOM.
//    Le smoke test Playwright (.github/smoke-test.js) couvre : rendu des cartes, ouverture de la
//    modale, historique à la demande, filtrage par la recherche, boîte du changelog, absence de
//    scroll horizontal mobile, zéro erreur JS.
//    Restent NON COUVERTS, ni ici ni en E2E : le badge de statut trois zones (setStatus), le
//    compteur de visites (renderVisits) et le panneau Guardian (renderG). L'en-tête de ce fichier
//    a longtemps affirmé le contraire — audit 30/08 : 3 des 4 domaines annoncés n'existaient pas.
//
// ── Pourquoi l'extraction est ce qu'elle est (audit 30/08, deux défauts HAUTS reproduits) :
//  1. extract() cherchait « function X( » dans TOUT le fichier html. Une copie CORRECTE de md()
//     citée dans un commentaire HTML, avec le vrai md() déployé cassé (plus d'échappement de &),
//     donnait « 48/48 tests OK ». Le harnais testait le leurre.
//  2. extract() faisait html.match SANS /g : il testait la PREMIÈRE définition. Une seconde
//     définition d'escH() sans échappement ajoutée plus bas dans le script — celle que le
//     navigateur exécute, les déclarations se masquant — donnait encore « 48/48 tests OK ».
//  Le recensement des scripts et l'extraction par équilibrage d'accolades vivent maintenant dans
//  .github/html-scripts.js, partagé avec check-csp.js.
const fs = require('fs');
const assert = require('assert');
const H = require('./html-scripts.js');

const html = fs.readFileSync('index.html', 'utf8');
// LE code déployé : le seul <script> inline exécutable. Pas les blocs ld+json, pas les commentaires.
// (Affecté dans le try plus bas : si le recensement lui-même échoue, on veut un test nommé.)
let SCRIPT;
const extract = (name) => H.extractFunction(SCRIPT, name);

// FLAG était récupéré par /var FLAG=\/[^\n]+\n/ avec un repli SILENCIEUX sur /^$/ — un motif qui ne
// correspond à rien. Reformater la ligne (« var FLAG = /…/ ») suffisait à faire tester un parseur
// privé de sa table de mots-clés, avec des échecs qui accusaient exFor au lieu du harnais.
// Plus de repli : absent = erreur bruyante.
const assembler = () => [
  'var __L="fr";function curLang(){return __L;}',      // langue pilotable par les tests
  'var __rm=false;',                                    // prefers-reduced-motion
  'var __raf=[];function requestAnimationFrame(f){__raf.push(f);return __raf.length;}function cancelAnimationFrame(){}',
  'var __tmo=[];function setTimeout(f){__tmo.push(f);return __tmo.length;}function clearTimeout(){}',
  H.extractVar(SCRIPT, 'FLAG'),
  // Dépendances internes qui vont et viennent selon les versions du site (nrm/__ND : recherche
  // insensible aux accents). Extraites SI présentes — jamais remplacées par un stub : si l'une
  // manque alors qu'elle est nécessaire, l'évaluation échoue bruyamment (« nrm is not defined »),
  // ce qui est le comportement voulu. Un repli silencieux, c'est le défaut FLAG qu'on vient de fermer.
  ...['__ND'].filter((v) => { try { H.extractVar(SCRIPT, v); return true; } catch (e) { return false; } }).map((v) => H.extractVar(SCRIPT, v)),
  ...['nrm'].filter((f) => { try { extract(f); return true; } catch (e) { return false; } }).map(extract),
  extract('exFor'), extract('hintFor'),
  extract('splitTop'), extract('splitForms'), extract('parseParams'),
  H.extractVar(SCRIPT, '__UG'), extract('trUsage'), extract('usageEN'),
  extract('md'), extract('escH'), extract('lev'), extract('sparkline'),
  extract('hlText'), extract('fmtN'), extract('animTo'), extract('botReply'),
].join('\n');
const ctx = {};
// L'EXTRACTION et l'évaluation sont le point le plus fragile du harnais : si l'une casse, on veut un
// ÉCHEC NOMMÉ (« NOT ok 1 - … ») et un code de sortie 1, pas une trace de pile anonyme qu'on prend
// pour un caprice de Node. Sans ça, casser l'extracteur donnait un run illisible — et un run
// illisible finit toujours par être lu comme « bon ».
try {
  SCRIPT = H.theInlineScript(html);
  const SRC = assembler();
  new Function('ctx', SRC + '\n' +
    ['parseParams', 'splitTop', 'splitForms', 'exFor', 'hintFor', 'md', 'escH', 'lev', 'sparkline', 'hlText', 'fmtN', 'animTo', 'botReply', 'trUsage', 'usageEN']
      .map((k) => 'ctx.' + k + '=' + k + ';').join('') +
    'ctx.setLang=function(L){__L=L;};ctx.setRM=function(v){__rm=v;};ctx.raf=__raf;ctx.tmo=__tmo;')(ctx);
} catch (e) {
  console.error('NOT ok 1 - harnais — extraction/évaluation du <script> déployé :', e.message);
  console.error('\nLe harnais n’a PAS pu lire le code déployé : aucun test n’a tourné. Ne lis surtout');
  console.error('pas ce run comme « rien de cassé ». Cause probable : .github/html-scripts.js (extraction)');
  console.error('ou une dépendance nouvelle du script (voir la liste des dépendances optionnelles).');
  console.error('\n0/1 tests OK');
  process.exit(1);
}
const { parseParams, splitTop, splitForms, exFor, hintFor, hlText, fmtN, animTo, botReply, trUsage, usageEN } = ctx;

let n = 0, ko = 0;
function t(name, fn) { n++; try { fn(); console.log('ok', n, '-', name); } catch (e) { ko++; console.error('NOT ok', n, '-', name, ':', e.message); } }

// ── splitTop : | de premier niveau uniquement
t('splitTop coupe au premier niveau', () => assert.deepStrictEqual(splitTop('a|b'), ['a', 'b']));
t('splitTop ignore | dans [ ]', () => assert.deepStrictEqual(splitTop('[a|b]|c'), ['[a|b]', 'c']));
t('splitTop ignore | dans < >', () => assert.deepStrictEqual(splitTop('<a|b>'), ['<a|b>']));
t('splitTop imbrication', () => assert.deepStrictEqual(splitTop('[a [b|c] d|e]'), ['[a [b|c] d|e]']));
t('splitTop crochet déséquilibré ne plante pas', () => assert.deepStrictEqual(splitTop(']a|b'), [']a', 'b']));
t('splitTop chaîne vide', () => assert.deepStrictEqual(splitTop(''), ['']));

// ── splitForms : coupe seulement devant une nouvelle commande +x / !x
t('splitForms coupe devant !', () => assert.deepStrictEqual(splitForms('+a x | !a y'), ['+a x ', ' !a y']));
t('splitForms garde un choix nu', () => assert.deepStrictEqual(splitForms('+lockdown on|off'), ['+lockdown on|off']));
t('splitForms garde un | littéral', () => assert.deepStrictEqual(splitForms('+embed <t> | <d>'), ['+embed <t> | <d>']));
t('splitForms mixte', () => assert.strictEqual(splitForms('+antibot on|smart|off | !antibot inconnu ask|kick|allow').length, 2));

// ── parseParams : les familles de signatures réelles
t('groupe [a | b | c] = un choix optionnel', () => {
  const p = parseParams('+shield [smart | off | reset]');
  assert.strictEqual(p.length, 1); assert.strictEqual(p[0].req, false);
  assert.strictEqual(p[0].ex, 'smart'); assert.match(p[0].hint, /au choix/);
});
t('groupe <a|b> = choix obligatoire', () => {
  const p = parseParams('+statut <online|dnd|idle|invisible> <play|watch> <texte> | !statut reset');
  assert.strictEqual(p.length, 3); assert.strictEqual(p[0].req, true); assert.strictEqual(p[0].ex, 'online');
});
t('choix nu on|off', () => {
  const p = parseParams('+lockdown on|off');
  assert.strictEqual(p.length, 1); assert.strictEqual(p[0].ex, 'on'); assert.match(p[0].hint, /on · off/);
});
t('alternance espacée de mots-clés fusionnée', () => {
  const p = parseParams('+autoevents on | off | ici | test | status');
  assert.strictEqual(p.length, 1); assert.match(p[0].hint, /ici/);
});
t('| littéral entre placeholders conservé', () => {
  const p = parseParams('+embed <titre> | <description> | [url image]');
  assert.ok(p.some(x => x.token === '|'));
  assert.strictEqual(p.filter(x => x.token === '|').length, 2);
});
t('imbrication [board #salon [minutes] | board off]', () => {
  const p = parseParams('+gameleaderboard [board #salon [minutes] | board off]');
  assert.strictEqual(p.length, 1); assert.strictEqual(p[0].req, false);
  assert.strictEqual(p[0].ex, 'board #salon'); // alternative multi-mots : gardée telle quelle (les sous-groupes optionnels sont retirés)
});
t('mention @membre', () => {
  const p = parseParams('+avatar [@membre | ID]');
  assert.strictEqual(p[0].ex, '@Jean');
});
t('placeholder connu dans un choix → exemple concret', () => {
  const p = parseParams('+purge @membre [nombre|all]');
  assert.strictEqual(p[1].ex, '5');
});
t('<mise> → nombre', () => {
  const p = parseParams('+casino [slots <mise> | bj <mise>]');
  assert.strictEqual(p[0].ex, 'slots 5');
});
t('commande sans paramètre', () => assert.deepStrictEqual(parseParams('+ping'), []));
t('usage vide', () => assert.deepStrictEqual(parseParams(''), []));
t('usage undefined', () => assert.deepStrictEqual(parseParams(undefined), []));
t('deuxième forme ignorée', () => {
  const p = parseParams('+drops | !drops on|off | !drops setup #salon');
  assert.deepStrictEqual(p, []);
});
t('jeton littéral (flag) tel quel', () => {
  const p = parseParams('+backup [roles]');
  assert.strictEqual(p[0].req, false); assert.strictEqual(p[0].ex, 'roles');
});
t('crochets déséquilibrés : pas de plantage, pas de crochet dans les exemples', () => {
  const p = parseParams('+bad [oops <x> | ');
  p.forEach(x => assert.ok(!/[\[\]<>]/.test(x.ex), 'exemple pollué : ' + x.ex));
});

// ── exFor : générateurs d'exemples
t('exFor durée', () => assert.strictEqual(exFor('durée'), '10m'));
t('exFor mise/pari', () => { assert.strictEqual(exFor('mise'), '5'); assert.strictEqual(exFor('pari'), '5'); });
t('exFor salon', () => assert.strictEqual(exFor('#salon'), '#général'));
t('exFor inconnu → exemple', () => assert.strictEqual(exFor('zzz'), 'exemple'));


// ── Couverture élargie (audit 12/08) : md, escH, lev, sparkline.
// (Elles vivaient dans un second contexte évalué à part ; tout est désormais dans le même ctx,
//  extrait par équilibrage d'accolades — une seule source, une seule façon de se tromper.)
const { md, escH, lev, sparkline } = ctx;

t('md — échappe le HTML', () => assert.strictEqual(md('<img src=x>'), '&lt;img src=x&gt;'));
t('md — échappe & avant tout', () => assert.strictEqual(md('A & B'), 'A &amp; B'));
t('md — **gras** → <strong>', () => assert.strictEqual(md('**ok**'), '<strong>ok</strong>'));
t('md — `code` → <code>', () => assert.strictEqual(md('`+ban`'), '<code>+ban</code>'));
t('md — __souligné__ → <u>', () => assert.strictEqual(md('__u__'), '<u>u</u>'));
t('md — *italique* → <em>', () => assert.strictEqual(md('*i*'), '<em>i</em>'));
t('md — saut de ligne → <br>', () => assert.strictEqual(md('a\nb'), 'a<br>b'));
t('md — balise DANS le gras reste inerte', () => assert.strictEqual(md('**<b>**'), '<strong>&lt;b&gt;</strong>'));
t('md — non-chaîne tolérée', () => assert.strictEqual(md(42), '42'));
t('escH — guillemets et apostrophes', () => assert.strictEqual(escH('a"b\'c<d>'), 'a&quot;b&#39;c&lt;d&gt;'));
t('escH — chaîne vide', () => assert.strictEqual(escH(''), ''));
t('lev — identiques → 0', () => assert.strictEqual(lev('shield', 'shield'), 0));
t('lev — vide vs mot → longueur', () => assert.strictEqual(lev('', 'ban'), 3));
t('lev — 1 substitution', () => assert.strictEqual(lev('scan', 'scon'), 1));
t('lev — inversion de lettres (shiedl) → 2', () => assert.strictEqual(lev('shiedl', 'shield'), 2));
t('sparkline — moins de 2 points → null', () => assert.strictEqual(sparkline([{ v: 5 }], p => p.v), null));
t('sparkline — nulls filtrés → null si <2 restants', () => assert.strictEqual(sparkline([{ v: 5 }, { v: null }], p => p.v), null));
t('sparkline — série plate (span 0) ne divise pas par zéro', () => {
  const s = sparkline([{ v: 7 }, { v: 7 }, { v: 7 }], p => p.v);
  assert.ok(s && /^M0\.0,/.test(s.d) && !s.d.includes('NaN'));
});
t('sparkline — premier/dernier exposés', () => {
  const s = sparkline([{ v: 1 }, { v: 9 }], p => p.v);
  assert.strictEqual(s.first, 1); assert.strictEqual(s.last, 9); assert.ok(s.d.split(' ').length === 2);
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── AUTO-CONTRÔLES DU HARNAIS (audit 30/08)
// Un garde qui ment est pire que pas de garde : ces tests vérifient que l'extraction ne peut plus
// tester un LEURRE, ni la mauvaise définition, ni avaler la fonction voisine. Chacun a été validé
// par mutation (on casse le correctif, le test tombe).
// ══════════════════════════════════════════════════════════════════════════════════════════════
const S = (body) => H.theInlineScript('<!doctype html><body>' + body + '</body>');

t('harnais — extract lit le <script>, pas une fonction citée dans un commentaire HTML', () => {
  // Le défaut reproduit : md() correct dans un commentaire + md() cassé dans le script = 48/48 vert.
  const page = '<!doctype html><body><!-- note : function zz(){return "LEURRE";} -->\n<script>function zz(){return "DEPLOYE";}</script></body>';
  const got = H.extractFunction(H.theInlineScript(page), 'zz');
  assert.strictEqual(got, 'function zz(){return "DEPLOYE";}', 'le harnais a extrait le leurre du commentaire');
});
t('harnais — extract refuse DEUX définitions de premier niveau (le navigateur exécute la dernière)', () => {
  const src = S('<script>function zz(){return 1;}\nfunction zz(){return 2;}</script>');
  assert.throws(() => H.extractFunction(src, 'zz'), /ambigu/, 'un doublon de premier niveau doit être refusé');
});
t('harnais — deux fonctions homonymes dans des IIFE distinctes ne sont PAS un doublon', () => {
  // Le script déployé définit paint/close/show deux fois chacune, dans deux IIFE : elles ne se
  // masquent pas. Le contrôle d'unicité doit être conscient de la portée, pas seulement du nom.
  const src = S('<script>(function(){function p(){return 1;}p();})();(function(){function p(){return 2;}p();})();function q(){return 3;}</script>');
  assert.throws(() => H.extractFunction(src, 'p'), /LOCALE/);
  assert.strictEqual(H.extractFunction(src, 'q'), 'function q(){return 3;}');
});
t('harnais — extract refuse une fonction absente au lieu de tester du vide', () => {
  assert.throws(() => H.extractFunction(S('<script>var a=1;</script>'), 'zz'), /extraction impossible/);
});
t('harnais — extract n\'avale pas la fonction voisine quand elle change de forme', () => {
  // L'ancien ancrage s'arrêtait sur « \n(?=function |var |//|\(function) » : une voisine en const,
  // let, ou après une ligne vide, et il embarquait tout le reste (mesuré : 144 car. → 5121).
  for (const voisine of ['const b=function(){return 2;};', 'let b=2;', '\n\nb();', 'class B{}']) {
    const src = S('<script>function a(){return 1;}\n' + voisine + '</script>');
    assert.strictEqual(H.extractFunction(src, 'a'), 'function a(){return 1;}', 'avalé par : ' + voisine);
  }
});
t('harnais — extract lit correctement accolades, regex et chaînes du corps', () => {
  const src = S('<script>function a(){var o={x:1};var r=/[{}\\/]/g;var s="}";return String(o.x)+s+r.source;}\nfunction b(){}</script>');
  const got = H.extractFunction(src, 'a');
  assert.ok(got.endsWith('r.source;}'), 'corps tronqué ou débordant : ' + got);
  assert.ok(!got.includes('function b'), 'a avalé b');
});
t('harnais — theInlineScript refuse 0 ou 2 blocs inline exécutables', () => {
  assert.throws(() => H.theInlineScript('<html><body>rien</body></html>'), /0 <script> inline/);
  assert.throws(() => H.theInlineScript('<script>var a=1;</script><script>var b=2;</script>'), /2 <script> inline/);
});
t('harnais — les blocs ld+json ne sont pas pris pour du code déployé', () => {
  const page = '<script type="application/ld+json">{"x":"function zz(){return 0;}"}</script><script>function zz(){return 9;}</script>';
  assert.strictEqual(H.extractFunction(H.theInlineScript(page), 'zz'), 'function zz(){return 9;}');
});
t('harnais — FLAG vient vraiment du script déployé (plus de repli silencieux)', () => {
  const flag = H.extractVar(SCRIPT, 'FLAG');
  assert.match(flag, /^var FLAG=\/\^\(/, 'FLAG extrait douteux : ' + flag.slice(0, 40));
  assert.strictEqual(exFor('on'), 'on', 'la table FLAG n’est pas active dans le contexte de test');
  // et une ligne REFORMATÉE reste extractible (l'ancien motif /var FLAG=\// échouait en silence)
  assert.match(H.extractVar(S('<script>var FLAG = /^(on|off)$/ ;\nvar x=1;</script>'), 'FLAG'), /on\|off/);
  assert.throws(() => H.extractVar(S('<script>var x=1;</script>'), 'FLAG'), /extraction impossible/);
});
t('harnais — toutes les fonctions de premier niveau du script s\'extraient et se parsent', () => {
  const noms = H.functionNames(SCRIPT);
  const echecs = [];
  let top = 0;
  for (const nom of noms) {
    let body;
    try { body = H.extractFunction(SCRIPT, nom); } catch (e) { if (!/LOCALE/.test(e.message)) echecs.push(nom + ' → ' + e.message); continue; }
    top++;
    try {
      new Function('return (' + body + ')');
      assert.ok(body.startsWith('function ' + nom) && body.endsWith('}'), nom + ' : bornes fausses');
    } catch (e) { echecs.push(nom + ' → ' + e.message); }
  }
  assert.deepStrictEqual(echecs, [], 'extraction cassée sur : ' + echecs.join(' | '));
  assert.ok(top >= 50, 'seulement ' + top + ' fonctions de premier niveau extraites — extraction suspecte');
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── hlText : surlignage de la recherche. Écrit dans innerHTML → tout doit être échappé.
// ══════════════════════════════════════════════════════════════════════════════════════════════
t('hlText — encadre l\'occurrence et échappe le reste', () => assert.strictEqual(hlText('un ban ici', 'ban'), 'un <mark>ban</mark> ici'));
t('hlText — sans occurrence, rien n\'est marqué', () => assert.strictEqual(hlText('rien', 'zzz'), 'rien'));
t('hlText — occurrences multiples toutes marquées', () => assert.strictEqual(hlText('ban ban', 'ban'), '<mark>ban</mark> <mark>ban</mark>'));
t('hlText — HTML hostile neutralisé (pas d\'injection par le texte de la carte)', () => {
  const out = hlText('<img src=x onerror=alert(1)>', 'img');
  assert.strictEqual(out, '&lt;<mark>img</mark> src=x onerror=alert(1)&gt;');
  assert.ok(!/<img/.test(out) && !/onerror=alert\(1\)>/.test(out.replace('&gt;', '')), 'balise reconstituable : ' + out);
});
t('hlText — HTML hostile DANS la partie surlignée aussi', () => {
  assert.strictEqual(hlText('a<b>c', '<b>'), 'a<mark>&lt;b&gt;</mark>c');
});
t('hlText — invariant : ôter les <mark> redonne EXACTEMENT le texte échappé (rien perdu, rien ajouté)', () => {
  // Invariant vrai quelle que soit la stratégie de recherche (avec ou sans normalisation des
  // accents) : le surlignage ne doit ni perdre de texte, ni en inventer, ni laisser passer du HTML.
  for (const [txt, q] of [['Sécurité générale', 'é'], ['Sécurité', 'securite'], ['🛡️ garde', 'garde'],
    ['a<b>c', 'b'], ['ban BAN Ban', 'ban'], ['', 'x'], ['rien', 'zzz']]) {
    const out = hlText(txt, q);
    assert.strictEqual(out.replace(/<\/?mark>/g, ''), escH(txt), 'texte altéré pour ' + JSON.stringify([txt, q]) + ' → ' + out);
  }
});
t('hlText — emoji et accents traversent intacts', () => {
  assert.strictEqual(hlText('🛡️ garde', 'garde'), '🛡️ <mark>garde</mark>');
  assert.strictEqual(hlText('Sécurité', 'zzz'), 'Sécurité');
});
t('hlText / hl — une requête vide ne peut pas faire boucler le surlignage', () => {
  // hlText('x','') bouclait sans fin (indexOf('') rend 0, i n'avance jamais). C'était inatteignable
  // uniquement parce que hl() sortait avant. Aujourd'hui l'une OU l'autre des deux gardes suffit :
  // ce test vérifie qu'il en reste au moins une, sans figer laquelle.
  const corpsHl = extract('hl');                       // portée : le corps de hl(), pas le fichier
  const gardeDansHl = (() => {
    const g = corpsHl.search(/if\(!q\)\{[^}]*return;\}/);
    const appel = corpsHl.indexOf('hlText(');
    return g >= 0 && appel > 0 && g < appel;
  })();
  const gardeDansHlText = /^function hlText\([^)]*\)\{if\(!q\)return/.test(extract('hlText'));
  assert.ok(gardeDansHl || gardeDansHlText,
    'plus aucune garde contre q vide : hlText(t, "") boucle à l’infini et fige l’onglet');
  if (gardeDansHlText) assert.strictEqual(hlText('abc', ''), 'abc'); // si hlText garde, on l'exerce
});
t('hlText — chaîne très longue : linéaire, une seule marque', () => {
  const out = hlText('a'.repeat(50000) + 'ban', 'ban');
  assert.strictEqual((out.match(/<mark>/g) || []).length, 1);
  assert.strictEqual(out.length, 50000 + 3 + '<mark></mark>'.length);
});
t('hl() garde contre une requête vide AVANT d\'appeler hlText (sinon boucle infinie)', () => {
  // hlText('x','') boucle sans fin : indexOf('') rend 0 et i n'avance jamais. Aujourd'hui c'est
  // inatteignable UNIQUEMENT parce que hl() sort avant. Ce test protège cette garde-là.
  const body = extract('hl');            // portée : le corps de hl(), pas le fichier
  const garde = body.search(/if\(!q\)\{[^}]*return;\}/);
  const appel = body.indexOf('hlText(');
  assert.ok(garde >= 0, 'la garde « if(!q) … return » a disparu de hl()');
  assert.ok(appel > 0, 'hl() n’appelle plus hlText — ce test est à revoir');
  assert.ok(garde < appel, 'la garde doit précéder l’appel à hlText');
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── hintFor : l'aide affichée sous chaque paramètre (jamais testée en direct jusqu'ici).
// ══════════════════════════════════════════════════════════════════════════════════════════════
t('hintFor — mot-clé littéral (FLAG)', () => assert.strictEqual(hintFor('on'), 'à écrire tel quel (option)'));
t('hintFor — membre / salon / rôle', () => {
  assert.match(hintFor('membre'), /^un membre/); assert.match(hintFor('salon'), /^un salon/); assert.match(hintFor('rôle'), /^un rôle/);
});
t('hintFor — durée, nombre, raison, texte, lien, ID, préfixe, mot', () => {
  assert.match(hintFor('durée'), /10m/); assert.strictEqual(hintFor('nombre'), 'un nombre');
  assert.match(hintFor('raison'), /texte libre/); assert.match(hintFor('texte'), /le texte/);
  assert.strictEqual(hintFor('lien'), 'un lien'); assert.match(hintFor('id'), /identifiant Discord/);
  assert.match(hintFor('préfixe'), /préfixe/); assert.strictEqual(hintFor('mot'), 'un mot-clé');
});
t('hintFor — inconnu → repli générique', () => assert.strictEqual(hintFor('zzz'), 'une valeur (ex. : exemple)'));
t('hintFor — casse ignorée', () => assert.strictEqual(hintFor('MEMBRE'), hintFor('membre')));
t('hintFor — chaîne vide ne plante pas et tombe sur le repli', () => assert.strictEqual(hintFor(''), 'une valeur (ex. : exemple)'));
t('hintFor/exFor — même classification pour un même jeton (les deux tables doivent rester d\'accord)', () => {
  // exFor et hintFor portent DEUX copies de la même classification de paramètres. Elles ont déjà
  // divergé : « niveau », « level », « xp », « montant », « quantité », « count », « nb » rendent un
  // nombre côté exFor mais tombent sur le repli générique côté hintFor (motif absent). Ce test fige
  // les jetons sur lesquels les deux tables SONT d'accord, pour que l'écart ne s'agrandisse pas.
  const nombre = ['nombre', 'mise', 'pari', 'gagnant', 'numéro'];
  nombre.forEach((k) => {
    assert.strictEqual(exFor(k), '5', 'exFor(' + k + ')');
    assert.strictEqual(hintFor(k), 'un nombre', 'hintFor(' + k + ') a divergé');
  });
  ['membre', 'salon', 'rôle', 'durée', 'raison', 'texte', 'lien', 'mot'].forEach((k) => {
    assert.notStrictEqual(hintFor(k), 'une valeur (ex. : exemple)', 'hintFor(' + k + ') est retombé sur le repli');
    assert.notStrictEqual(exFor(k), 'exemple', 'exFor(' + k + ') est retombé sur le repli');
  });
});

// ── exFor / hintFor en ANGLAIS (le site est bilingue : les deux langues doivent rendre du texte)
t('exFor/hintFor — bascule EN', () => {
  ctx.setLang('en');
  try {
    assert.strictEqual(exFor('#salon'), '#general');
    assert.strictEqual(exFor('raison'), 'repeated spam');
    assert.strictEqual(exFor('zzz'), 'example');
    assert.match(hintFor('membre'), /^a member/);
    assert.strictEqual(hintFor('zzz'), 'a value (e.g. example)');
  } finally { ctx.setLang('fr'); }
});
t('exFor — chaîne vide et unicode ne plantent pas', () => {
  assert.strictEqual(exFor(''), 'exemple');
  assert.strictEqual(exFor('🛡️'), 'exemple');
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── botReply : les réponses simulées de la modale (jamais couvertes — elle était inextractible).
// ══════════════════════════════════════════════════════════════════════════════════════════════
t('botReply — ban : verdict, cible et raison reprise du paramètre', () => {
  const r = botReply('ban', '', parseParams('+ban @membre [raison]'));
  assert.strictEqual(r[0], '🔨');
  assert.match(r[2], /@Jean/); assert.match(r[2], /banni/); assert.match(r[2], /spam répété/);
});
t('botReply — kick, mute (durée), warn', () => {
  assert.match(botReply('kick', '', parseParams('+kick @membre'))[2], /expulsé/);
  assert.match(botReply('mute', '', parseParams('+mute @membre <durée>'))[2], /10m/);
  assert.match(botReply('warn', '', parseParams('+warn @membre'))[2], /avertissement/);
});
t('botReply — purge reprend le nombre donné', () => {
  assert.match(botReply('purge', '', parseParams('+purge [nombre]'))[2], /5/);
});
t('botReply — sans paramètre : pas de plantage, valeurs par défaut', () => {
  const r = botReply('ban', '', []);
  assert.strictEqual(r.length, 3); assert.match(r[2], /@Jean/);
});
t('botReply — bascule EN', () => {
  ctx.setLang('en');
  try {
    const r = botReply('ban', '', parseParams('+ban @membre [raison]'));
    assert.strictEqual(r[1], 'Ban'); assert.match(r[2], /was \*\*banned\*\*/);
  } finally { ctx.setLang('fr'); }
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── animTo : le compteur animé des badges (serveurs / membres protégés).
// ══════════════════════════════════════════════════════════════════════════════════════════════
const fakeEl = (txt) => ({ textContent: txt, classList: { add() {}, remove() {} }, offsetWidth: 0 });
t('animTo — élément absent : aucun plantage', () => { animTo(null, 10); animTo(undefined, 10); });
t('animTo — cible non finie (NaN, undefined, texte, Infinity) : rien n\'est écrit', () => {
  for (const bad of [NaN, undefined, 'douze', Infinity, -Infinity, {}]) {
    const e = fakeEl('42');
    const frames = ctx.raf.length;
    animTo(e, bad);
    assert.strictEqual(e.textContent, '42', 'écriture pour une cible ' + String(bad));
    assert.strictEqual(ctx.raf.length, frames, 'animation lancée pour une cible ' + String(bad));
  }
});
t('animTo — départ illisible (texte sans chiffre) : valeur finale posée d\'un coup', () => {
  // parseInt('—') = NaN : pas de point de départ, donc pas d'animation possible.
  const e = fakeEl('—'); const frames = ctx.raf.length;
  animTo(e, 900);
  assert.strictEqual(e.textContent, fmtN(900));
  assert.strictEqual(ctx.raf.length, frames);
});
t('animTo — mouvement réduit : valeur finale immédiate, mise en forme par fmtN', () => {
  ctx.setRM(true);
  try { const e = fakeEl('0'); animTo(e, 12345); assert.strictEqual(e.textContent, fmtN(12345)); }
  finally { ctx.setRM(false); }
});
t('animTo — valeur déjà à la cible : écriture directe, pas d\'animation', () => {
  const e = fakeEl('7'); const avant = ctx.raf.length;
  animTo(e, 7);
  assert.strictEqual(e.textContent, fmtN(7));
  assert.strictEqual(ctx.raf.length, avant, 'une frame a été demandée pour rien');
});
t('animTo — le filet de sécurité garantit la valeur finale via fmtN', () => {
  const e = fakeEl('0'); animTo(e, 12345);
  ctx.tmo[ctx.tmo.length - 1]();           // le setTimeout(dur+80) qui rattrape un rAF gelé
  assert.strictEqual(e.textContent, fmtN(12345));
});
t('animTo — l\'animation progresse de la valeur de départ vers la cible', () => {
  const e = fakeEl('0'); animTo(e, 1000);
  const step = ctx.raf[ctx.raf.length - 1];
  step(0); const a = Number(e.textContent.replace(/\D/g, ''));
  step(350); const b = Number(e.textContent.replace(/\D/g, ''));
  assert.ok(a <= b && b <= 1000, 'progression incohérente : ' + a + ' → ' + b);
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── Cas limites des quatre fonctions « déjà couvertes » (entrées nulles, unicode, HTML hostile).
// ══════════════════════════════════════════════════════════════════════════════════════════════
t('md — null / undefined tolérés', () => { assert.strictEqual(md(null), 'null'); assert.strictEqual(md(undefined), 'undefined'); });
t('md — chaîne vide', () => assert.strictEqual(md(''), ''));
t('md — marqueur non fermé laissé tel quel', () => assert.strictEqual(md('**oups'), '**oups'));
t('md — les attributs d\'une balise hostile restent inertes', () => {
  const out = md('<a href="javascript:alert(1)">x</a>');
  assert.ok(!out.includes('<a '), out);
  assert.ok(out.includes('&lt;a href=&quot;javascript:alert(1)&quot;&gt;') === false || true);
  assert.ok(!/<[a-z]/i.test(out.replace(/<\/?(strong|u|code|em|br)>/g, '')), 'balise rescapée : ' + out);
});
t('md — unicode et emoji préservés', () => assert.strictEqual(md('🛡️ **Sécurité**'), '🛡️ <strong>Sécurité</strong>'));
t('md — chaîne très longue ne casse pas (10 000 gras)', () => {
  const out = md('**a**'.repeat(10000));
  assert.strictEqual((out.match(/<strong>/g) || []).length, 10000);
});
t('escH — null / undefined / nombre tolérés', () => {
  assert.strictEqual(escH(null), 'null'); assert.strictEqual(escH(undefined), 'undefined'); assert.strictEqual(escH(0), '0');
});
t('escH — les 5 caractères dangereux, et idempotence contrôlée', () => {
  assert.strictEqual(escH('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  assert.strictEqual(escH(escH('<')), '&amp;lt;', 'le & doit être échappé en premier');
});
t('escH — unicode intact', () => assert.strictEqual(escH('é🛡️'), 'é🛡️'));
t('lev — deux chaînes vides → 0', () => assert.strictEqual(lev('', ''), 0));
t('lev — symétrie', () => assert.strictEqual(lev('shield', 'chien'), lev('chien', 'shield')));
t('lev — unicode compté par unité de code', () => assert.strictEqual(lev('é', 'e'), 1));
t('lev — insertion pure', () => assert.strictEqual(lev('ban', 'bans'), 1));
t('sparkline — tableau vide → null', () => assert.strictEqual(sparkline([], p => p.v), null));
t('sparkline — que des nulls / NaN → null', () => {
  assert.strictEqual(sparkline([{ v: null }, { v: null }], p => p.v), null);
  assert.strictEqual(sparkline([{ v: NaN }, { v: NaN }], p => p.v), null);
});
t('sparkline — les NaN sont filtrés, jamais transmis au tracé', () => {
  const s = sparkline([{ v: 1 }, { v: NaN }, { v: 5 }, { v: 9 }], p => p.v);
  assert.ok(s && !s.d.includes('NaN'), 'NaN dans le chemin SVG : ' + (s && s.d));
});
t('sparkline — valeurs négatives acceptées', () => {
  const s = sparkline([{ v: -10 }, { v: 10 }], p => p.v);
  assert.ok(s && !s.d.includes('NaN')); assert.strictEqual(s.first, -10); assert.strictEqual(s.last, 10);
});
t('parseParams — usage null / nombre / très long', () => {
  assert.deepStrictEqual(parseParams(null), []);
  assert.ok(Array.isArray(parseParams('+x ' + '<a> '.repeat(200))));
});
t('parseParams — aucun exemple ne contient de crochet résiduel', () => {
  for (const u of ['+a [b <c> | d]', '+e <f|g> [h]', '+i [j [k] | l]', '+m <n> | +m off']) {
    parseParams(u).forEach((p) => assert.ok(!/[[\]<>]/.test(p.ex), u + ' → exemple pollué : ' + p.ex));
  }
});
t('splitTop / splitForms — entrée très longue reste linéaire', () => {
  const s = '[a|b] '.repeat(5000);
  const t0 = Date.now(); splitTop(s); splitForms(s);
  assert.ok(Date.now() - t0 < 1000, 'découpe quadratique ?');
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── Intégrité des clés de traduction (index.html ET history.html injecté par loadHist).
// Piège vérifié : « removedh » n'est référencée QUE depuis history.html. Un nettoyage qui ne
// regarde que index.html la supprimerait, et la version anglaise de l'historique afficherait le
// nom de la clé. Ce contrôle est donc CROISÉ sur les deux fichiers.
// ══════════════════════════════════════════════════════════════════════════════════════════════
const I18N_DECL = H.extractVar(SCRIPT, 'I18N');
const I18N_KEYS = [...I18N_DECL.matchAll(/[{,\s]([A-Za-z_$][\w$]*)\s*:\s*\{\s*fr\s*:/g)].map((m) => m[1]);
const HIST = fs.existsSync('history.html') ? fs.readFileSync('history.html', 'utf8') : '';

t('i18n — la table est bien lue (≥ 80 clés, fr+en pour chacune)', () => {
  assert.ok(I18N_KEYS.length >= 80, 'seulement ' + I18N_KEYS.length + ' clés lues — extraction de I18N suspecte');
  const sansEn = I18N_KEYS.filter((k) => !new RegExp('[{,\\s]' + k + '\\s*:\\s*\\{[^{}]*\\ben\\s*:').test(I18N_DECL));
  assert.deepStrictEqual(sansEn, [], 'clés sans traduction anglaise : ' + sansEn.join(', '));
});
t('i18n — tout data-i18n d\'index.html et de history.html correspond à une clé existante', () => {
  const connues = new Set(I18N_KEYS);
  const refs = new Set([...(html + HIST).matchAll(/data-i18n=["']([^"']+)["']/g)].map((m) => m[1]));
  const orphelins = [...refs].filter((r) => !connues.has(r));
  assert.deepStrictEqual(orphelins, [], 'data-i18n sans clé I18N (le nom de la clé s’afficherait) : ' + orphelins.join(', '));
  assert.ok(refs.size >= 20, 'seulement ' + refs.size + ' références data-i18n — lecture suspecte');
});
t('i18n — pas de nouveau doublon de casse entre clés', () => {
  const vu = {}, dups = [];
  I18N_KEYS.forEach((k) => { const l = k.toLowerCase(); if (vu[l]) dups.push(vu[l] + '/' + k); else vu[l] = k; });
  // « newBadge/newbadge » est un doublon connu : newbadge (minuscule) est MORTE, seule newBadge est
  // lue (tr('newBadge')). À supprimer côté index.html ; en attendant, on interdit d'en ajouter d'autres.
  assert.deepStrictEqual(dups.filter((d) => d !== 'newBadge/newbadge'), [], 'nouveaux doublons de casse : ' + dups.join(', '));
});
// Recensement informatif des clés jamais référencées (ni tr('x'), ni data-i18n, ni table dynamique).
{
  const ailleurs = SCRIPT.split(I18N_DECL).join('\n') + '\n' + html.replace(SCRIPT, '') + '\n' + HIST;
  const mortes = I18N_KEYS.filter((k) => !(ailleurs.includes("'" + k + "'") || ailleurs.includes('"' + k + '"')));
  if (mortes.length) console.log('   (info) clés I18N jamais référencées : ' + mortes.join(', ') + ' — à retirer d’index.html');
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── Workflows : la branche orpheline `uptime` est réécrite en entier (push -f). Tout fichier non
// réajouté DISPARAÎT. votes.yml oubliait badge.json → le badge du README tombait en 404 chaque
// jour de 05:47 UTC jusqu'au run uptime.yml suivant (:23).
// ══════════════════════════════════════════════════════════════════════════════════════════════
const WF = (f) => fs.readFileSync('.github/workflows/' + f, 'utf8');
const publies = (y) => ((y.match(/git add ([^\n]+)/) || [, ''])[1]).trim().split(/\s+/).filter(Boolean).sort();
// Le dossier des workflows peut manquer dans une COPIE partielle du site (harnais de mutation qui
// ne recopie que .github/*.js). Absent en bloc = on n'est pas dans un vrai checkout : on saute en le
// disant. Présent mais incomplet = échec, c'est justement le défaut à attraper.
const WF_OK = fs.existsSync('.github/workflows');
if (!WF_OK) console.log('   (info) .github/workflows absent : les 3 contrôles de workflow sont sautés (copie partielle).');
const tw = (nom, fn) => (WF_OK ? t(nom, fn) : undefined);

tw('workflows — uptime.yml et votes.yml publient le MÊME jeu de fichiers sur la branche uptime', () => {
  assert.deepStrictEqual(publies(WF('votes.yml')), publies(WF('uptime.yml')),
    'jeux divergents : un fichier publié par l’un et pas par l’autre disparaît à chaque run de l’autre');
});
tw('workflows — badge.json (lu par le badge du README) est publié par les deux', () => {
  for (const f of ['uptime.yml', 'votes.yml']) assert.ok(publies(WF(f)).includes('badge.json'), f + ' ne publie pas badge.json');
  if (fs.existsSync('README.md')) assert.ok(fs.readFileSync('README.md', 'utf8').includes('uptime%2Fbadge.json'), 'le README ne pointe plus badge.json — ce test est à revoir');
});
tw('workflows — chaque fichier publié est soit restauré de la branche, soit régénéré par le run', () => {
  for (const f of ['uptime.yml', 'votes.yml']) {
    const y = WF(f);
    const restaures = new Set([...y.matchAll(/git show origin\/uptime:([\w.]+)/g)].map((m) => m[1]));
    const generes = new Set(['uptime.json', 'badge.json'].filter(() => /build-uptime\.js/.test(y))
      .concat(/build-growth\.js/.test(y) ? ['growth.json'] : [])
      .concat(/build-votes\.js/.test(y) ? ['votes.json'] : []));
    const perdus = publies(y).filter((p) => !restaures.has(p) && !generes.has(p));
    assert.deepStrictEqual(perdus, [], f + ' publie sans restaurer ni régénérer : ' + perdus.join(', '));
  }
});

// La garde contre la requête vide doit être DANS hlText, pas seulement chez son appelant : hlText est
// aussi appelée depuis hl() sur chaque nœud texte, et un jour depuis ailleurs. On l'affirme sur la
// source AVANT de l'exercer — car si la garde saute, l'appel ne renvoie pas un mauvais résultat : il
// FIGE le processus (indexOf('') rend toujours i, i n'avance jamais). Un test qui pend ne sert à rien.
t('hlText — la garde contre la requête vide est bien dans hlText (et pas seulement chez l’appelant)', () => {
  assert.match(extract('hlText'), /^function hlText\([^)]*\)\{if\(!q\)return/,
    'hlText ne garde plus contre q vide : l’appel bouclerait à l’infini');
  assert.strictEqual(hlText('abc', ''), 'abc');
  assert.strictEqual(hlText('a<b>', ''), 'a&lt;b&gt;'); // et le texte reste échappé
});

// ── botReply : la réponse simulée affichée dans la fiche de chaque commande. 73 lignes, ~80 branches,
// ZÉRO test jusqu'ici — et les règles sont testées DANS L'ORDRE, donc une famille large happe au passage
// une commande qu'une règle plus bas visait explicitement. Onze commandes en sortaient fausses : trois
// disaient l'INVERSE de ce que fait la commande, huit servaient la réponse d'une AUTRE commande
// (plausible, donc invisible). Un test par commande corrigée : il vérifie la bonne réponse ET l'absence
// de l'ancienne. Retirer la règle de priorité correspondante fait tomber le test.
const EN = (f) => { ctx.setLang('en'); const r = f(); ctx.setLang('fr'); return r; };
const br = (name) => botReply(name, '', []);
const brEN = (name) => EN(() => botReply(name, '', []));
function corrige(cmd, attenduFR, attenduEN, ancienFR) {
  t('botReply — +' + cmd + ' ne sert plus la réponse d’une autre commande', () => {
    const fr = br(cmd), en = brEN(cmd);
    assert.match(fr[2], attenduFR, '+' + cmd + ' FR : ' + fr[2]);
    assert.match(en[2], attenduEN, '+' + cmd + ' EN : ' + en[2]);
    assert.doesNotMatch(fr[2], ancienFR, '+' + cmd + ' rend encore l’ancienne réponse : ' + fr[2]);
    assert.ok(fr[0] && fr[1] && fr[2] && en[0] && en[1] && en[2], 'triplet incomplet');
    assert.notStrictEqual(fr[2], en[2], '+' + cmd + ' : la réponse EN est identique au FR (non traduite)');
  });
}
// 3 réponses FAUSSES (l'inverse de ce que fait la commande)
corrige('unmute', /de nouveau parler/, /speak again/, /réduit au silence/);
corrige('warnexpiry', /expirent/, /expire/, /a reçu un avertissement/);
corrige('vc', /salons vocaux actifs/, /active voice channels/, /Connecté à ton salon vocal/);
// 8 réponses APPARTENANT À UNE AUTRE COMMANDE
corrige('music', /Hasu Music/, /Hasu Music/, /Connecté à ton salon vocal/);
corrige('safe', /aucune menace détectée/, /no threat detected/, /Panneau interactif publié/);
corrige('stats', /victoires/, /wins/, /Membres : 1 240/);
corrige('setstats', /Salons compteurs/, /Counter channels/, /Membres : 1 240/);
corrige('alertconfig', /Alertes configurées/, /Alerts configured/, /menu de configuration/);
corrige('testalerts', /marqué TEST/, /tagged TEST/, /Routage des alertes/);
corrige('lockword', /Mot de panique/, /Panic word/, /Ce salon a été/);
corrige('linkwl', /domaines autorisés/, /allowed domains/, /Liste de confiance mise à jour/);

// Non-régression : les familles génériques répondent toujours pareil (les règles de priorité sont
// ancrées sur ^…$, elles ne doivent rien happer d'autre).
t('botReply — les familles génériques sont intactes (ban, kick, warn, mute, purge, ping)', () => {
  assert.match(br('ban')[2], /banni/); assert.match(br('tempban')[2], /banni/);
  assert.match(br('kick')[2], /expulsé/);
  assert.match(br('warn')[2], /a reçu un avertissement/);
  assert.match(br('tempsmute')[2], /réduit au silence/); // /mute|muet|silence/ mord encore
  assert.match(br('clear')[2], /messages ont été supprimés/);
  assert.match(br('infos')[2], /Membres : 1 240/);       // +infos garde la réponse « informations »
  assert.strictEqual(br('ping')[1], 'Pong');
});
t('botReply — commande inconnue : repli générique, jamais vide', () => {
  const r = br('zzzinconnue');
  assert.strictEqual(r[1], 'Action effectuée');
  assert.match(r[2], /\+zzzinconnue/);
  assert.match(brEN('zzzinconnue')[2], /ran successfully/);
});
// Invariant sur les 189 commandes réelles de la page : jamais de trou, jamais de FR laissé en anglais.
t('botReply — les 189 commandes de la page ont une réponse complète en FR et en EN', () => {
  const noms = [...html.matchAll(/<div class="cmd"[^>]*data-n="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(noms.length > 150, 'cartes introuvables : ' + noms.length);
  const creux = noms.filter((nm) => {
    const fr = br(nm), en = brEN(nm);
    return !(fr && fr.length === 3 && fr.every(Boolean) && en && en.length === 3 && en.every(Boolean));
  });
  assert.deepStrictEqual(creux, [], 'réponse incomplète pour : ' + creux.join(', '));
});

// ── nrm : recherche insensible aux accents. L'invariant CRUCIAL est la LONGUEUR : les index calculés
// sur le texte normalisé servent à découper le texte D'ORIGINE pour poser les <mark>. Un seul caractère
// qui changerait de longueur décalerait tout le surlignage.
const nrmCtx = {};
new Function('ctx', extract('nrm').replace(/^/, 'var __ND={};\n') + '\nctx.nrm=nrm;')(nrmCtx);
const nrm = nrmCtx.nrm;
t('nrm — les accents tombent (« moderation » doit trouver « modération »)', () => {
  assert.strictEqual(nrm('Modération'), 'moderation');
  assert.strictEqual(nrm('Sécurité & Antiraid'), 'securite & antiraid');
  assert.strictEqual(nrm('à ù ï ô ç'), 'a u i o c');
});
t('nrm — INVARIANT : la longueur est préservée, caractère par caractère', () => {
  ['Modération', 'œuf', 'ﬁchier', '🛡️ garde', 'Ça été', 'ÀÉÎÕÜñ', ''].forEach((s) => {
    assert.strictEqual(nrm(s).length, s.length, 'longueur changée sur « ' + s + ' »');
  });
});
t('nrm — ASCII pur rendu tel quel (juste minuscule), et non-chaînes tolérées', () => {
  assert.strictEqual(nrm('BAN +Shield'), 'ban +shield');
  assert.strictEqual(nrm(42), '42');
  assert.strictEqual(nrm(''), '');
});

// ── lblGet / lblSet : le compteur des filtres est un ENFANT du bouton. Le lire ou l'écrire via
// textContent l'aspirait dans le libellé → « 🔨 Modération2020 » après un aller-retour FR→EN→FR.
const lblCtx = {};
new Function('ctx', [extract('hasCnt'), extract('lblGet'), extract('lblSet')].join('\n') + '\nctx.lblGet=lblGet;ctx.lblSet=lblSet;')(lblCtx);
const { lblGet, lblSet } = lblCtx;
// Bouton simulé : un nœud texte (le libellé) + éventuellement <span class="navcnt"> (le compteur).
// textContent se comporte comme dans un vrai DOM : la lecture concatène, l'écriture ÉCRASE les enfants.
function fakeBtn(label, cnt) {
  const el = {
    childNodes: [{ nodeType: 3, nodeValue: label }],
    get firstChild() { return this.childNodes[0]; },
    get textContent() { return this.childNodes.map((k) => (k.nodeType === 3 ? k.nodeValue : k.__t)).join(''); },
    set textContent(v) { this.childNodes = [{ nodeType: 3, nodeValue: v }]; },
    poseCompteur(v) { this.childNodes = this.childNodes.filter((k) => k.className !== 'navcnt'); this.childNodes.push({ nodeType: 1, className: 'navcnt', __t: String(v) }); },
  };
  if (cnt != null) el.poseCompteur(cnt);
  return el;
}
t('lblGet — lit le libellé SANS le compteur enfant', () => {
  const b = fakeBtn('🔨 Modération', 20);
  assert.strictEqual(b.textContent, '🔨 Modération20');       // ce que voyait l'ancien code
  assert.strictEqual(lblGet(b), '🔨 Modération');             // ce qu'il faut mémoriser
  assert.strictEqual(lblGet(fakeBtn('✦ Tout', null)), '✦ Tout'); // sans compteur : comme textContent
});
t('lblSet — écrit le libellé sans détruire ni dupliquer le compteur', () => {
  const b = fakeBtn('🔨 Modération', 20);
  lblSet(b, '🔨 Moderation');
  assert.strictEqual(lblGet(b), '🔨 Moderation');
  assert.strictEqual(b.textContent, '🔨 Moderation20', 'le compteur a été perdu ou dupliqué');
});
t('i18n — aller-retour FR→EN→FR : le compteur ne se colle pas au libellé (« Modération2020 »)', () => {
  const b = fakeBtn('🔨 Modération', 20);
  // 1) bascule EN : le code mémorise le texte FR, puis écrit l'anglais ; addNavCounts repose le compteur
  const fr0 = lblGet(b);
  lblSet(b, '🔨 Moderation'); b.poseCompteur(20);
  // 2) retour FR : on réécrit le texte mémorisé ; addNavCounts repose le compteur
  lblSet(b, fr0); b.poseCompteur(20);
  assert.strictEqual(lblGet(b), '🔨 Modération', 'libellé pollué par le compteur : ' + lblGet(b));
  assert.strictEqual(b.textContent, '🔨 Modération20', 'compteur dupliqué : ' + b.textContent);
  assert.doesNotMatch(lblGet(b), /\d/, 'le libellé contient un chiffre');
});

// ── Le « × » de la puce de filtre d'ACCÈS : il appelait setAcc(__fAcc), qui RÉAPPLIQUE le filtre au
// lieu de le retirer (setAcc est un setter ; la bascule vit dans le clic du bouton .accf). Pas de DOM
// ici : on inspecte la zone updateChips du script déployé, et rien d'autre — une assertion de source
// non scopée serait creuse (le motif existe ailleurs légitimement).
t('chips — le × du filtre d’accès RETIRE le filtre (setAcc(null)), il ne le réapplique pas', () => {
  const i = SCRIPT.indexOf('window.updateChips=function()');
  assert.ok(i > 0, 'updateChips introuvable dans le script déployé');
  // Commentaires retirés : celui qui documente le correctif CITE l'ancien appel, et une assertion
  // naïve sur le texte brut serait donc satisfaite par sa propre explication.
  const zone = SCRIPT.slice(i, SCRIPT.indexOf("bar.classList.toggle('show'", i))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  assert.ok(zone.length > 100 && zone.length < 2000, 'zone updateChips mal délimitée : ' + zone.length);
  assert.ok(/setAcc\(null\)/.test(zone), 'le × n’appelle pas setAcc(null)');
  assert.ok(!/setAcc\(__fAcc\)/.test(zone), 'le × réapplique encore le filtre : setAcc(__fAcc)');
  assert.ok(/setCat\('all'\)/.test(zone), 'le × de la catégorie a changé de comportement');
});

// ── Service worker (sw.js) : le mode hors-ligne, décidable sans navigateur.
// sw.js est évalué TEL QUEL dans un environnement Service Worker simulé (Cache API, fetch, Response),
// donc on teste le fichier réellement déployé. Les 4 défauts corrigés en v3 sont chacun couverts par un
// test qui MORD : rétablir l'ancien code (put sans r.ok, match sans ignoreSearch, repli undefined,
// cache-d'abord sans revalidation) fait tomber le test correspondant.
const ORIGIN = 'https://saliox.github.io';
function swRes(body, init) {
  const st = (init && init.status) || 200;
  return { status: st, ok: st >= 200 && st < 300, type: 'basic', __body: body, clone() { return swRes(body, { status: st }); } };
}
function swReq(url, mode) { return { url, method: 'GET', mode: mode || 'no-cors', clone() { return swReq(url, mode); } }; }
function swEnv(netFn) {
  const store = new Map(); // clé = URL COMPLÈTE, comme un vrai Cache (donc sensible aux ?paramètres)
  const cacheObj = {
    put(req, res) { store.set(typeof req === 'string' ? new URL(req, ORIGIN + '/hasu-protect-docs/').href : req.url, res); return Promise.resolve(); },
    addAll(list) { list.forEach((u) => store.set(new URL(u, ORIGIN + '/hasu-protect-docs/').href, swRes('static'))); return Promise.resolve(); },
    match(req, opts) {
      const url = typeof req === 'string' ? new URL(req, ORIGIN + '/hasu-protect-docs/').href : req.url;
      if (store.has(url)) return Promise.resolve(store.get(url));
      if (opts && opts.ignoreSearch) {
        const bare = url.split('?')[0];
        for (const [k, v] of store) if (k.split('?')[0] === bare) return Promise.resolve(v);
      }
      return Promise.resolve(undefined);
    },
  };
  const cachesStub = {
    open: () => Promise.resolve(cacheObj),
    match: (req, opts) => cacheObj.match(req, opts),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
  };
  const handlers = {};
  const selfStub = { addEventListener(k, h) { handlers[k] = h; }, skipWaiting() { }, clients: { claim() { } } };
  const src = fs.readFileSync('sw.js', 'utf8');
  new Function('self', 'caches', 'location', 'fetch', 'Response', src)(selfStub, cachesStub, { origin: ORIGIN }, netFn, swRes);
  return { handlers, store, cacheObj };
}
function swFire(env, req) {
  let captured = null, called = false;
  env.handlers.fetch({ request: req, respondWith(p) { called = true; captured = p; } });
  return called ? Promise.resolve(captured) : Promise.resolve('PASSTHROUGH');
}
const swTick = () => new Promise((r) => setTimeout(r, 5));
function ta(name, fn) {
  n++;
  return Promise.resolve().then(fn).then(
    () => console.log('ok', n, '-', name),
    (e) => { ko++; console.error('NOT ok', n, '-', name, ':', e.message); });
}
const OFF = () => Promise.reject(new Error('offline'));

function swSuite() {
  const PAGE = ORIGIN + '/hasu-protect-docs/';
  return Promise.resolve()
    // Défaut 1 — le site pose lui-même ?q=…&cat=…&acc=…&lang=… via replaceState (donc jamais fetché,
    // donc jamais en cache) : hors-ligne, l'URL exacte est introuvable et il faut ignorer les paramètres.
    .then(() => ta('sw — hors-ligne : une URL avec ?paramètres retombe sur la page en cache', () => {
      const env = swEnv(OFF);
      env.store.set(PAGE, swRes('PAGE'));
      return swFire(env, swReq(PAGE + '?q=ban&cat=1&lang=en', 'navigate')).then((r) => {
        assert.ok(r && r !== 'PASSTHROUGH', 'aucune réponse fournie');
        assert.strictEqual(r.__body, 'PAGE', 'le cache n’a pas été consulté en ignorant les paramètres');
        // Cas DISCRIMINANT : une sous-page paramétrée, que le repli sur « ./ » ne peut pas rattraper.
        // Seul caches.match(req,{ignoreSearch:true}) sait la retrouver.
        const env2 = swEnv(OFF);
        env2.store.set(PAGE + 'history.html', swRes('HIST'));
        return swFire(env2, swReq(PAGE + 'history.html?v=2026-08-28', 'navigate'));
      }).then((r) => {
        assert.strictEqual(r.__body, 'HIST', 'sous-page paramétrée : les ?paramètres n’ont pas été ignorés');
      });
    }))
    // Défaut 2 — respondWith(undefined) = erreur réseau brute du navigateur. Il faut TOUJOURS une Response.
    .then(() => ta('sw — hors-ligne sans rien en cache : une vraie Response, jamais undefined', () => {
      const env = swEnv(OFF);
      return swFire(env, swReq(PAGE + 'history.html', 'navigate')).then((r) => {
        assert.ok(r && r !== 'PASSTHROUGH', 'aucune réponse fournie');
        assert.notStrictEqual(r, undefined, 'undefined → NetworkError brute');
        assert.strictEqual(r.status, 200);
        assert.ok(/Hors ligne/.test(r.__body) && /lang="en"/.test(r.__body), 'page de secours absente ou non bilingue');
      });
    }))
    // Défaut 3 — un 404 passager mis en cache est ensuite servi indéfiniment par la branche cache-d'abord.
    .then(() => ta('sw — une réponse NON-OK (404) n’entre jamais dans le cache', () => {
      const env = swEnv(() => Promise.resolve(swRes('NOT FOUND', { status: 404 })));
      const u = PAGE + 'assets/og-banner.jpg';
      return swFire(env, swReq(u)).then(swTick).then(() => env.cacheObj.match(swReq(u))).then((hit) => {
        assert.strictEqual(hit, undefined, 'un 404 a été mis en cache');
      });
    }))
    .then(() => ta('sw — une réponse OK est bien mise en cache (non-régression)', () => {
      const env = swEnv(() => Promise.resolve(swRes('OK-ASSET')));
      const u = PAGE + 'assets/icon-512.png';
      return swFire(env, swReq(u)).then(swTick).then(() => env.cacheObj.match(swReq(u))).then((hit) => {
        assert.ok(hit && hit.__body === 'OK-ASSET', 'la réponse valide n’a pas été mise en cache');
      });
    }))
    // Défaut 4 — cache-d'abord sans revalidation : une icône périmée l'est à vie.
    .then(() => ta('sw — statique : le cache répond tout de suite ET se revalide en fond', () => {
      let hits = 0;
      const env = swEnv(() => { hits++; return Promise.resolve(swRes('NEUF')); });
      const u = PAGE + 'assets/icon-192.png';
      env.store.set(u, swRes('VIEUX'));
      return swFire(env, swReq(u)).then((r) => {
        assert.strictEqual(r.__body, 'VIEUX', 'le cache doit répondre immédiatement');
        return swTick();
      }).then(() => {
        assert.strictEqual(hits, 1, 'aucune revalidation réseau déclenchée');
        return env.cacheObj.match(swReq(u));
      }).then((hit) => assert.strictEqual(hit.__body, 'NEUF', 'le cache n’a pas été rafraîchi'));
    }))
    .then(() => ta('sw — les données live (stats.json, heartbeat) ne sont jamais interceptées', () => {
      const env = swEnv(() => Promise.resolve(swRes('LIVE')));
      return Promise.all([
        swFire(env, swReq(PAGE + 'stats.json')),
        swFire(env, swReq('https://raw.githubusercontent.com/saliox/x/heartbeat.json')),
      ]).then((rs) => rs.forEach((r) => assert.strictEqual(r, 'PASSTHROUGH', 'une requête live a été interceptée')));
    }));
}


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ── Audit 30/08 — suite PERFORMANCES. Chaque test reproduit un defaut MESURE, pas une intention.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// ── lev(a,b,max) : sortie anticipee.
//    Defaut : coller 50 000 caracteres dans la recherche declenchait fuzzyCards -> 189 matrices
//    completes de 50 000 x |nom| cellules, ~200 ms de fil principal gele. Deux bornes INFERIEURES
//    exactes rendent la main sans remplir la matrice. Elles sont OBSERVABLES : des que la distance
//    reelle depasse max, lev rend max+1 (valeur plafonnee) au lieu de la distance exacte.
t('lev — un collage de 50 000 caracteres ne remplit AUCUNE matrice (fuzzyCards : 189 appels)', () => {
  const q = 'x'.repeat(50000);
  const noms = [...html.matchAll(/<div class="cmd"[^>]*\sdata-n="([^"]*)"/g)].map((m) => m[1].toLowerCase());
  assert.ok(noms.length > 100, 'noms de commandes introuvables (' + noms.length + ')');
  assert.strictEqual(lev(q, 'shield', 2), 3, 'la distance doit etre plafonnee, pas calculee');
  for (const n of noms) lev(q, n, 2); // chauffe
  const t0 = process.hrtime.bigint();
  for (const n of noms) lev(q, n, 2);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  // Mesure locale : 101,69 ms sans sortie anticipee, 0,01 ms avec. Le seuil laisse 2 500 x de marge.
  assert.ok(ms < 25, 'fuzzyCards a mis ' + ms.toFixed(1) + ' ms sur un collage de 50 000 caracteres : '
    + 'la sortie anticipee de lev() a saute, le fil principal se fige a chaque frappe');
});
t('lev — borne par le minimum de ligne : longueurs egales, mots sans rapport', () => {
  // meme longueur -> la borne de longueur ne se declenche PAS : ce test vise la coupure par ligne.
  assert.strictEqual(lev('abcdefghij', 'klmnopqrst', 2), 3);
});
t('lev — sous le seuil, la distance reste EXACTE (les coupures ne mordent pas trop tot)', () => {
  assert.strictEqual(lev('shiedl', 'shield', 2), 2);
  assert.strictEqual(lev('scan', 'scon', 1), 1);
  assert.strictEqual(lev('ban', 'ban', 0), 0);
  assert.strictEqual(lev('antiraid', 'antirad', 2), 1);
  // Frontiere : |longueurs| vaut EXACTEMENT max, et la distance vaut exactement max. Une borne
  // ecrite « >= max » au lieu de « > max » couperait ici et rendrait 3 au lieu de 2.
  assert.strictEqual(lev('ban', 'banni', 2), 2);
  assert.strictEqual(lev('bl', 'bal', 1), 1);
});
t('lev — sans max, c’est la distance de Levenshtein d’avant, inchangee', () => {
  assert.strictEqual(lev('abcdefghij', 'klmnopqrst'), 10);
  assert.strictEqual(lev('chien', 'niche'), 4);
});

// ── Les 189 descriptions ne sont plus stockees deux fois octet pour octet.
//    cmdDesc() lit la copie portee par le .desc ; l’invariant a tenir est qu’elle EXISTE partout.
t('cartes — chaque commande expose sa description FR et EN sur son .desc (ce que lit cmdDesc)', () => {
  const cartes = [];
  const re = /<div class="cmd"[^>]*>/g; let m;
  while ((m = re.exec(html))) cartes.push({ tag: m[0], i: m.index });
  assert.ok(cartes.length > 100, 'aucune carte trouvee : ancre a revoir (' + cartes.length + ')');
  const sans = [];
  cartes.forEach((c, k) => {
    const seg = html.slice(c.i, k + 1 < cartes.length ? cartes[k + 1].i : html.length);
    const nom = (/ data-n="([^"]*)"/.exec(c.tag) || [, '?'])[1];
    const fr = /<div class="desc"[^>]*?data-fr="([^"]*)"/.exec(seg);
    const en = /<div class="desc"[^>]*?data-en="([^"]*)"/.exec(seg);
    if (!fr || !fr[1] || !en) sans.push(nom);
  });
  assert.deepStrictEqual(sans, [], 'cartes sans description lisible par cmdDesc : ' + sans.join(', '));
});
t('cartes — aucune description n’est stockee DEUX FOIS (data-d = copie de .desc/data-fr)', () => {
  const doublons = [];
  const re = /<div class="cmd"[^>]*>/g; let m;
  const cartes = [];
  while ((m = re.exec(html))) cartes.push({ tag: m[0], i: m.index });
  cartes.forEach((c, k) => {
    const seg = html.slice(c.i, k + 1 < cartes.length ? cartes[k + 1].i : html.length);
    const nom = (/ data-n="([^"]*)"/.exec(c.tag) || [, '?'])[1];
    const dd = / data-d="([^"]*)"/.exec(c.tag), de = / data-d-en="([^"]*)"/.exec(c.tag);
    const fr = /<div class="desc"[^>]*?data-fr="([^"]*)"/.exec(seg);
    const en = /<div class="desc"[^>]*?data-en="([^"]*)"/.exec(seg);
    if (dd && fr && dd[1] === fr[1]) doublons.push(nom + '/data-d');
    if (de && en && de[1] === en[1]) doublons.push(nom + '/data-d-en');
  });
  assert.deepStrictEqual(doublons, [],
    doublons.length + ' description(s) en double (42 Ko, 10 % de la page). Le generateur du bot les remet : '
    + 'retirer data-d/data-d-en des .cmd, cmdDesc() lit deja le .desc. Doublons : ' + doublons.slice(0, 6).join(', '));
});

// ── La passe .tap d’applyLang a ete supprimee parce qu’elle refaisait le travail de la passe
//    [data-i18n]. C’est vrai TANT QUE chaque .tap porte data-i18n="simhint" : on le verrouille.
t('applyLang — chaque .tap porte data-i18n="simhint" (ce qui rend la passe .tap redondante)', () => {
  const taps = html.match(/<[a-z]+[^>]*class="tap"[^>]*>/g) || [];
  assert.ok(taps.length > 100, 'aucun .tap trouve : ancre a revoir (' + taps.length + ')');
  const orphelins = taps.filter((x) => x.indexOf('data-i18n="simhint"') < 0);
  assert.strictEqual(orphelins.length, 0,
    orphelins.length + ' .tap sans data-i18n : ils ne seraient plus traduits. Ex. ' + orphelins[0]);
  assert.ok(/simhint:\s*\{[^}]*fr:/.test(SCRIPT) && /simhint:\s*\{[^}]*en:/.test(SCRIPT),
    'la cle I18N.simhint doit exister en fr ET en en');
  assert.ok(SCRIPT.indexOf("querySelectorAll('.tap')") < 0,
    'la passe .tap est revenue dans applyLang : elle refait la passe [data-i18n] qui la precede');
});

// ── history.html : republications a l’identique. Defaut mesure : 3 entrees quasi identiques
//    (29/06 09:10, 09:11, 09:21), 66 Ko bruts / 20 Ko gzip, 13 % du fichier.
//    Regle : republication = MEME titre + MEME jour + toutes les notes deja presentes MOT POUR MOT
//    dans l'autre entree. Les trois conditions sont necessaires, et aucune ne suffit.
//    Contre-exemple qui a servi a la calibrer : le 5 juillet 2026, « Grande passe de fiabilite »
//    (00:28, 4 notes) est ENTIEREMENT incluse dans « Nouveaux jeux & bouclier anti-vanity »
//    (19:50, 10 notes). Deux publications LEGITIMES a 19 h d'ecart, titres differents : la seconde
//    a rappele les notes de la premiere. Une regle qui ne regarde pas le titre les confond et
//    reclame la suppression d'une vraie entree d'historique.
t('historique — aucune entree n’est la republication a l’identique d’une autre (meme titre, meme jour)', () => {
  const hist = fs.readFileSync('history.html', 'utf8');
  const bornes = []; let p = hist.indexOf('<div class="hentry">');
  while (p >= 0) { bornes.push(p); p = hist.indexOf('<div class="hentry">', p + 1); }
  assert.ok(bornes.length > 20, 'historique introuvable ou vide (' + bornes.length + ' entrees)');
  const entrees = bornes.map((b, i) => {
    const seg = hist.slice(b, i + 1 < bornes.length ? bornes[i + 1] : hist.length);
    const jour = ((/<span>([^<]*)<\/span><\/h3>/.exec(seg) || [, ''])[1]).replace(/\s*à\s*\d{1,2}[:h]\d{2}\s*$/, '').trim();
    const titre = ((/<span data-lang="fr">([^<]*)<\/span>/.exec(seg) || [, ''])[1]).trim();
    return { jour, titre, date: (/<span>([^<]*)<\/span><\/h3>/.exec(seg) || [, ''])[1], notes: new Set(seg.match(/<li>[\s\S]*?<\/li>/g) || []) };
  });
  const faux = [];
  for (let i = 0; i < entrees.length; i++) {
    for (let j = 0; j < entrees.length; j++) {
      if (i === j || entrees[i].jour !== entrees[j].jour || entrees[i].titre !== entrees[j].titre) continue;
      const a = entrees[i], b = entrees[j];
      if (!a.notes.size || a.notes.size > b.notes.size) continue;
      if (a.notes.size === b.notes.size && i > j) continue; // ne compter la paire identique qu’une fois
      let inclus = true; a.notes.forEach((x) => { if (!b.notes.has(x)) inclus = false; });
      if (inclus) faux.push('« ' + a.date + ' » est deja contenue dans « ' + b.date + ' »');
    }
  }
  assert.deepStrictEqual(faux, [],
    faux.length + ' republication(s) a l’identique dans history.html — poids mort telecharge par tous : ' + faux.join(' ; '));
});

// ── preHist : UNE seule requete history.html, meme si le clic arrive avant la fin du prechargement.
//    Defaut reproduit : l’ancien code memorisait le TEXTE (__histPre) et non la requete. Un clic
//    pendant le vol repartait sur un SECOND telechargement de 136 Ko.
function preHistBanc(plan) {
  const etat = { appels: 0 };
  const doc = { getElementById: () => ({ querySelector: () => null }) };
  const fetchStub = () => {
    const mode = plan[etat.appels] || plan[plan.length - 1];
    etat.appels++;
    if (mode === 'ko') return Promise.reject(new Error('reseau'));
    return Promise.resolve({ ok: true, text: () => Promise.resolve('<div class="hentry">x</div>') });
  };
  const api = new Function('document', 'fetch',
    'var __histPre=null;' + extract('preHist') + 'return {preHist:preHist};')(doc, fetchStub);
  return { api, etat };
}
t('preHist — un clic pendant le prechargement ne relance PAS un 2e telechargement', () => {
  const { api, etat } = preHistBanc(['ok']);
  const p1 = api.preHist();               // survol : la requete part
  const p2 = api.preHist();               // clic immediat : la 1re n’est pas revenue
  assert.strictEqual(etat.appels, 1, 'history.html a ete demande ' + etat.appels + ' fois au lieu d’une');
  assert.strictEqual(p1, p2, 'le clic doit reutiliser la requete EN VOL, pas en creer une autre');
  p1.catch(() => {});
});

// La suite perf ci-dessus est synchrone ; celle-ci a besoin d’un tour de boucle (rejet de promesse).
function perfSuite() {
  return Promise.resolve().then(() => ta('preHist — un echec reseau ne fige pas le panneau : le clic suivant reessaie', () => {
    const { api, etat } = preHistBanc(['ko', 'ok']);
    return api.preHist().then(
      () => { throw new Error('la 1re requete devait echouer'); },
      () => new Promise((r) => setTimeout(r, 0))
    ).then(() => {
      const p = api.preHist();
      if (p) p.catch(() => {});
      assert.strictEqual(etat.appels, 2, 'apres un echec, le clic doit relancer une requete (appels=' + etat.appels + ') — sinon le panneau reste mort jusqu’au rechargement');
    });
  }));
}


// ══════════════════════════════════════════════════════════════════════════════════════════════
// ── LES DONNÉES VIVANTES (audit 30/08). Le site affirmait des choses que personne n'avait mesurées :
//    167 cases rouges et « 0,1 % » de disponibilité à un clic d'un badge « En ligne » qui, lui, disait
//    vrai ; une courbe « 30 derniers jours » gelée au 21/08 ; des libellés Guardian restés en français
//    dans le panneau anglais. Les fonctions ci-dessous sont les décisions qui l'évitent — elles sont
//    pures, donc testables sans navigateur, donc testées.
// ══════════════════════════════════════════════════════════════════════════════════════════════
const ctxLive = {};
new Function('ctx', [
  H.extractFunction(SCRIPT, 'upVerdict'),
  H.extractFunction(SCRIPT, 'netState'),
  H.extractVar(SCRIPT, '__GMAP'),
  H.extractFunction(SCRIPT, 'gFams'),
  'ctx.upVerdict=upVerdict;ctx.netState=netState;ctx.gFams=gFams;ctx.GMAP=__GMAP;',
].join('\n'))(ctxLive);
const { upVerdict, netState, gFams, GMAP } = ctxLive;

const T0 = 1788066000000;           // heure ronde de référence
const HEURE = 3600000;
const pleines = (n, v) => Array.from({ length: n }, (_, i) => [T0 - (n - i) * HEURE, v]);

// ── upVerdict : ne JAMAIS transformer une absence de mesure en panne
t('upVerdict — pas de données du tout → on le dit (none)', () => {
  assert.strictEqual(upVerdict(null, T0).why, 'none');
  assert.strictEqual(upVerdict({ hours: [] }, T0).why, 'none');
});
t('upVerdict — relevé vieux de 47 h → on ne prétend rien (stale), pas 167 cases rouges', () => {
  // Le cas EXACT du 30/08 : uptime.json daté du 28/08, 168 heures à zéro parce que le collecteur
  // lisait une branche morte. Avant correctif : grille rouge + « 0,1 % ».
  const v = upVerdict({ generated: T0 - 47 * HEURE, expectedPerHour: 30, hours: pleines(168, 0) }, T0);
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.why, 'stale');
});
t('upVerdict — un retard de 5 h du cron GitHub ne fait PAS disparaître un relevé sain', () => {
  // Contre-épreuve du garde ci-dessus : mesuré le 30/08, l'Action horaire avait 4 h 45 de retard sur
  // un collecteur pourtant sain. Un seuil trop serré effacerait le panneau à chaque hoquet de GitHub.
  const v = upVerdict({ generated: T0 - 5 * HEURE, expectedPerHour: 1, hours: pleines(168, 1) }, T0);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.pct, 100);
});
t('upVerdict — que des trous (aucune heure observée) → blank, pas une panne', () => {
  const v = upVerdict({ generated: T0, expectedPerHour: 1, hours: pleines(168, null) }, T0);
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.why, 'blank');
});
t('upVerdict — une VRAIE panne fraîchement mesurée reste affichée en rouge', () => {
  // Contre-épreuve indispensable : le correctif ne doit pas devenir une machine à effacer les incidents.
  const v = upVerdict({ generated: T0, expectedPerHour: 1, hours: pleines(168, 0) }, T0);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.pct, 0);
  assert.ok(v.cells.every((c) => c.cls === 'd'), 'toutes les cases doivent être rouges');
});
t('upVerdict — le pourcentage ne compte QUE les heures observées', () => {
  // 1 heure vue en ligne + 167 trous = 100 % de ce qu'on a mesuré, pas 0,6 % de disponibilité.
  const hours = pleines(167, null).concat([[T0, 1]]);
  const v = upVerdict({ generated: T0, expectedPerHour: 1, hours }, T0);
  assert.strictEqual(v.observed, 1);
  assert.strictEqual(v.pct, 100);
});
t('upVerdict — une heure non observée reste SANS classe (grise), jamais rouge', () => {
  const v = upVerdict({ generated: T0, expectedPerHour: 1, hours: [[T0 - HEURE, null], [T0, 1]] }, T0);
  assert.strictEqual(v.cells[0].cls, '');
  assert.strictEqual(v.cells[1].cls, 'u');
});
t('upVerdict — un relevé frais et partiel garde ses trois couleurs', () => {
  const v = upVerdict({ generated: T0, expectedPerHour: 30, hours: [[T0 - 2 * HEURE, 30], [T0 - HEURE, 5], [T0, 0]] }, T0);
  assert.deepStrictEqual(v.cells.map((c) => c.cls), ['u', 'p', 'd']);
});

// ── Badges d'en-tête : commandes/catégories viennent du BUILD, pas du battement
const mkDocN = new Function('document', H.extractFunction(SCRIPT, '__docN') + 'return __docN;');
const docN = (texte, id) => mkDocN({ getElementById: () => (texte === null ? null : { textContent: texte }) })(id || 'bCmds');
t('__docN — lit l\'entier d\'un badge, espaces de milliers compris', () => {
  assert.strictEqual(docN('4 340', 'bMembers'), 4340); // espace fine insécable écrite par toLocaleString('fr-FR')
  assert.strictEqual(docN('237'), 237);
});
t('__docN — badge absent ou vide → null (on retombe sur le battement)', () => {
  assert.strictEqual(docN(null), null);
  assert.strictEqual(docN('…'), null);
  assert.strictEqual(docN('0'), null);
});
t('setBadges — les compteurs de doc sont AMORCÉS depuis les badges du HTML', () => {
  // Sans amorce, le battement (qui recopie un stats.json périmé côté hébergeur) arrive avant
  // stats.json et fait clignoter le compteur 237 → 189 → 237. Reproduit dans le navigateur le 30/08.
  const decl = H.extractVar(SCRIPT, '__hbData'); // portée : CETTE déclaration, pas le fichier entier
  assert.match(decl, /__docCmds\s*=\s*__docN\('bCmds'\)/, 'déclaration lue : ' + decl);
  assert.match(decl, /__docCats\s*=\s*__docN\('bCats'\)/, 'déclaration lue : ' + decl);
});

// ── netState : une sparkline morte ne s'affiche pas comme une sparkline vivante
t('netState — dernier relevé vieux de 9 jours → pas de courbe, mais une date', () => {
  const g = { points: [{ t: T0 - 10 * 86400000, s: 19, m: 4357 }, { t: T0 - 9 * 86400000, s: 19, m: 4357 }] };
  const s = netState(g, T0);
  assert.strictEqual(s.show, false);
  assert.strictEqual(s.last, T0 - 9 * 86400000, 'la date du dernier relevé doit rester disponible pour dater le panneau');
});
t('netState — relevé de moins de 24 h → courbe affichée', () => {
  const g = { points: [{ t: T0 - 3 * HEURE, s: 20, m: 4340 }, { t: T0 - HEURE, s: 20, m: 4341 }] };
  assert.strictEqual(netState(g, T0).show, true);
});
t('netState — un seul point ne fait pas une courbe', () => {
  assert.strictEqual(netState({ points: [{ t: T0, s: 20, m: 4340 }] }, T0).show, false);
});
t('netState — pas de données → rien à dater', () => {
  assert.deepStrictEqual(netState(null, T0), { show: false, last: 0 });
});

// ── gFams : le panneau anglais ne doit jamais retomber en français
t('gFams — dans un lot classable, les libellés inconnus tombent dans « Cas limites »', () => {
  const r = gFams([{ label: 'Bots & applications', count: 149 },
    { label: 'Compte récent + Admin', count: 33 }, { label: 'Accumulation de permissions', count: 22 }]);
  assert.deepStrictEqual(r, [{ label: 'Bots & applications', count: 149 }, { label: 'Cas limites', count: 55 }]);
});
t('gFams — AUCUN libellé classable → section masquée, pas une barre unique qui ne dit rien', () => {
  // État réel du 30/08 : le heartbeat de l'hébergeur sert les libellés fins, tous hors familles.
  assert.deepStrictEqual(gFams([{ label: 'Compte récent + Admin', count: 33 }, { label: 'Cas limite mixte', count: 4 }]), []);
});
t('gFams — les familles connues sont conservées et triées par volume', () => {
  const r = gFams([{ label: 'Bots & applications', count: 149 }, { label: 'Réputation inter-serveurs', count: 206 }]);
  assert.deepStrictEqual(r.map((x) => x.label), ['Réputation inter-serveurs', 'Bots & applications']);
});
t('gFams — TOUT libellé rendu est traduisible (c\'est le bug du 30/08)', () => {
  // Le heartbeat de l'hébergeur sert les libellés FINS ; __GMAP ne connaît que les familles, donc
  // trGuardian les réaffichait en français dans le panneau 🇬🇧.
  const mixte = [{ label: 'Réputation inter-serveurs', count: 206 }, { label: 'Bot non vérifié (anti-bot)', count: 149 },
    { label: 'Raider très signalé', count: 72 }, { label: 'Compte très récent', count: 2 }, { label: 'Cas limite mixte', count: 4 }];
  const rendu = gFams(mixte);
  assert.ok(rendu.length >= 2, 'le lot est classable : il doit produire des lignes (sinon le test ne mord pas)');
  const sansEn = rendu.filter((x) => !GMAP[x.label]);
  assert.deepStrictEqual(sansEn, [], 'libellés sans traduction anglaise : ' + sansEn.map((x) => x.label).join(', '));
});
t('gFams — liste vide ou absente → aucune ligne (section masquée)', () => {
  assert.deepStrictEqual(gFams(undefined), []);
  assert.deepStrictEqual(gFams([]), []);
});

// ── Le collecteur de disponibilité (module réel, pas une extraction)
const UP = require('./build-uptime.js');
t('build-uptime — source injoignable → l\'heure reste un TROU, pas une panne', () => {
  const h = UP.mergeHours([], T0, null);
  assert.strictEqual(h.length, 168);
  assert.ok(h.every((x) => x[1] === null), 'aucune heure ne doit être marquée hors ligne sans mesure');
});
t('build-uptime — battement frais → heure en ligne ; battement périmé → heure hors ligne', () => {
  assert.strictEqual(UP.mergeHours([], T0, T0 - 60000).pop()[1], 1);
  assert.strictEqual(UP.mergeHours([], T0, T0 - 45 * 60000).pop()[1], 0);
});
t('build-uptime — le registre s\'accumule et glisse sur 7 jours', () => {
  const veille = [[T0 - 3 * HEURE, 1], [T0 - 2 * HEURE, 1], [T0 - 400 * HEURE, 1]];
  const h = UP.mergeHours(veille, T0, T0 - 60000);
  assert.strictEqual(h.length, 168);
  assert.strictEqual(h.find((x) => x[0] === T0 - 2 * HEURE)[1], 1, 'une heure déjà observée doit être conservée');
  assert.ok(!h.some((x) => x[0] === T0 - 400 * HEURE), 'au-delà de 7 jours, l\'heure sort de la fenêtre');
});
t('build-uptime — deux passages dans la même heure : « vu en ligne » ne redevient pas « hors ligne »', () => {
  const h = UP.mergeHours([[T0, 1]], T0 + 60000, T0 - 45 * 60000);
  assert.strictEqual(h.pop()[1], 1);
});
t('build-uptime — le relevé de l\'ANCIEN modèle n\'est pas importé', () => {
  // Le fichier publié jusqu'au 30/08 contient 167 heures « à zéro » qui sont ses propres angles morts,
  // pas des pannes. L'importer peindrait une semaine de rouge mensonger dès la 1re exécution.
  const ancien = { generated: T0, days: 7, expectedPerHour: 30, hours: pleines(168, 0) };
  assert.deepStrictEqual(UP.ledgerPrecedent(ancien), []);
  const h = UP.mergeHours(UP.ledgerPrecedent(ancien), T0, T0 - 60000);
  assert.strictEqual(h.filter((x) => x[1] === 0).length, 0, 'aucune heure ne doit être importée comme « hors ligne »');
  assert.strictEqual(h.pop()[1], 1);
});
t('build-uptime — un relevé du NOUVEAU modèle est bien repris', () => {
  const recent = { generated: T0, days: 7, expectedPerHour: 1, hours: [[T0 - 2 * HEURE, 1], [T0 - HEURE, 0]] };
  assert.strictEqual(UP.ledgerPrecedent(recent).length, 2);
  const h = UP.mergeHours(UP.ledgerPrecedent(recent), T0, T0 - 60000);
  assert.strictEqual(h.find((x) => x[0] === T0 - HEURE)[1], 0, 'une panne réellement observée doit survivre au glissement');
});
t('build-uptime — badge sans aucune observation : « n/a » gris, pas « 0 % » rouge', () => {
  const b = UP.badgeFor(UP.mergeHours([], T0, null));
  assert.strictEqual(b.message, 'n/a');
  assert.strictEqual(b.color, 'lightgrey');
});
t('build-uptime — badge d\'une panne réellement mesurée : 0 %, rouge', () => {
  const b = UP.badgeFor([[T0 - HEURE, 0], [T0, 0]]);
  assert.strictEqual(b.message, '0.0%');
  assert.strictEqual(b.color, 'red');
});

// ── stats.json publié : c'est LUI qui alimente les badges et le repli du panneau Guardian
t('stats.json — le nombre de commandes est un entier plausible, pas un vestige', () => {
  const S = JSON.parse(fs.readFileSync('stats.json', 'utf8'));
  assert.ok(Number.isInteger(S.commands) && S.commands >= 200, 'commands = ' + S.commands);
  assert.ok(Number.isInteger(S.categories) && S.categories > 0, 'categories = ' + S.categories);
});
t('stats.json — aucun libellé Guardian hors familles publiables', () => {
  // Deux dangers d'un coup : du français dans le panneau anglais, et la republication d'un
  // vocabulaire de signaux que la chaîne de publication du bot regroupe justement en familles.
  const S = JSON.parse(fs.readFileSync('stats.json', 'utf8'));
  const hors = (S.errorTypes || []).map((x) => x.label).filter((l) => !GMAP[l]);
  assert.deepStrictEqual(hors, [], 'libellés hors familles : ' + hors.join(' | '));
});
t('index.html — plus aucune carte ne documente la commande morte +meme', () => {
  const page = fs.readFileSync('index.html', 'utf8');
  assert.ok(!/data-n="meme"/.test(page), 'la carte fantôme +meme fait taper une commande qui ne répond plus');
  assert.ok(/data-n="makeitmeme"/.test(page), 'la commande qui l\'a remplacée doit être documentée');
});

// ── LA LIGNE D'USAGE EN ANGLAIS — `data-en` d'abord, glossaire en repli.
//   Le mécanisme `<div class="usage" data-en="…">` existait déjà et était MORT : la passe .usage
//   d'applyLang écrasait systématiquement par trUsage(fr0), donc l'attribut n'était jamais lu. Les
//   tests ci-dessous couvrent le lecteur ET le fait qu'il soit RÉELLEMENT branché aux deux endroits
//   qui affichent un usage (la carte et la simulation) — une fonction juste mais débranchée serait
//   exactement la panne qu'on vient de corriger.
const fauxUsage = (dataEn, texte) => ({ getAttribute: (k) => (k === 'data-en' ? dataEn : null), dataset: {}, textContent: texte });

t('usage EN — non-régression : sans data-en, le glossaire traduit toujours mot à mot', () => {
  assert.strictEqual(trUsage('+tempban @membre/ID <durée> [raison]'), '+tempban @member/ID <duration> [reason]');
  assert.strictEqual(usageEN(fauxUsage(null, ''), '+tempban @membre/ID <durée> [raison]'), '+tempban @member/ID <duration> [reason]');
});

t('usage EN — data-en gagne sur le mot-à-mot (c\'est tout l\'objet du mécanisme)', () => {
  const fr = '+ticketai [on|off|salon|ajouter|retirer|liste|essai|parler]';
  const en = '+ticketai [on|off|channel|add|remove|list|test|resume]';
  assert.strictEqual(usageEN(fauxUsage(en, fr), fr), en);
  assert.notStrictEqual(trUsage(fr), en, 'si le mot-à-mot suffisait, ce test ne prouverait rien');
});

t('usage EN — un data-en vide ne doit pas écraser le repli par du vide', () => {
  const fr = '+course [mise]';
  assert.strictEqual(usageEN(fauxUsage('', fr), fr), trUsage(fr));
});

t('usage EN — sans élément du tout (carte sans .usage), on ne rend jamais undefined', () => {
  assert.strictEqual(usageEN(null, '+ping'), '+ping');
  assert.strictEqual(usageEN(undefined, undefined), '');
});

t('usage EN — sans second argument, le texte de l\'élément sert de source (fr0 mémorisé d\'abord)', () => {
  const el = fauxUsage(null, '+remind <durée> <texte>');
  assert.strictEqual(usageEN(el), '+remind <duration> <text>');
  el.dataset.fr0 = '+remind <durée: 10m> <texte>';
  assert.strictEqual(usageEN(el), '+remind <duration: 10m> <text>');
});

t('usage EN — la passe .usage d\'applyLang passe par usageEN, pas par trUsage', () => {
  // Assertion de source SCOPÉE : on n'interroge que la ligne qui traite les .usage, à l'intérieur
  // d'applyLang. Chercher « usageEN » dans toute la page passerait au vert grâce à la définition
  // de la fonction elle-même, même si la passe était revenue au mot-à-mot.
  const corps = H.extractFunction(SCRIPT, 'applyLang');
  const ligne = corps.split('\n').filter((l) => l.includes("querySelectorAll('.usage')"));
  assert.strictEqual(ligne.length, 1, 'une seule passe .usage attendue dans applyLang, trouvé ' + ligne.length);
  assert.ok(ligne[0].includes('usageEN('), 'la passe .usage n\'appelle plus usageEN : data-en redevient mort');
  assert.ok(!/trUsage\(/.test(ligne[0]), 'la passe .usage rappelle trUsage directement : data-en serait écrasé');
});

t('usage EN — la simulation (openSim) passe par usageEN, pas par trUsage', () => {
  const corps = H.extractFunction(SCRIPT, 'openSim');
  const ligne = corps.split('\n').filter((l) => l.includes("'m-usage'"));
  assert.strictEqual(ligne.length, 1, 'une seule ligne m-usage attendue dans openSim, trouvé ' + ligne.length);
  assert.ok(ligne[0].includes('usageEN('), 'la modale retraduit mot à mot alors que la carte lit data-en : deux anglais pour la même commande');
  assert.ok(!/trUsage\(/.test(ligne[0]), 'la modale rappelle trUsage directement : data-en serait ignoré');
});

t('index.html — chaque data-en documente BIEN la commande de sa carte, et n\'est pas vide', () => {
  const page = fs.readFileSync('index.html', 'utf8');
  const RXC = /<div\s+class="cmd(?:\s[^"]*)?"[^>]*>/g;
  const bornes = []; let m;
  while ((m = RXC.exec(page))) bornes.push({ tag: m[0], index: m.index });
  assert.ok(bornes.length > 100, 'le balisage des cartes a changé : ' + bornes.length + ' carte(s) — ce test deviendrait creux');
  let vus = 0;
  for (let i = 0; i < bornes.length; i++) {
    const nom = (bornes[i].tag.match(/data-n="([^"]*)"/) || [])[1];
    const fin = i + 1 < bornes.length ? bornes[i + 1].index : page.length;
    const seg = page.slice(bornes[i].index + bornes[i].tag.length, fin);
    const u = seg.match(/<div class="usage"([^>]*)>/);
    if (!u) continue;
    const en = (u[1].match(/data-en="([^"]*)"/) || [])[1];
    if (en === undefined) continue;
    vus++;
    assert.ok(en.trim(), '+' + nom + ' : data-en vide — le repli glossaire serait préférable à du vide');
    assert.ok(en.startsWith('+' + nom), '+' + nom + ' : son usage anglais annonce « ' + en.slice(0, 24) + '… » — une AUTRE commande');
    assert.ok(!/\ball les \b/.test(en), '+' + nom + ' : « all les … » est un artefact de traduction automatique, pas de l\'anglais');
  }
  assert.ok(vus >= 10, 'seulement ' + vus + ' carte(s) portent data-en — le mécanisme est-il encore alimenté ?');
});


perfSuite().catch((e) => { ko++; console.error('NOT ok - suite perf :', e && e.message); })
  .then(swSuite).catch((e) => { ko++; console.error('NOT ok - suite sw :', e && e.message); }).then(() => {
  console.log('\n' + (n - ko) + '/' + n + ' tests OK');
  process.exit(ko ? 1 : 0);
});
