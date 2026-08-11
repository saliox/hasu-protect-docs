// Tests unitaires des fonctions PURES du site (parseur de signatures + générateurs d'exemples).
// Les fonctions sont extraites d'index.html par ancrage puis évaluées avec des stubs minimaux —
// on teste donc le code réellement déployé, pas une copie. Lancé par check-csp.yml.
// Le reste (statut trois zones, compteur, panneau, mobile) est couvert par les suites E2E Playwright.
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
function extract(name) {
  const m = html.match(new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n(?=function |var |//|\\(function)', ''));
  if (!m) throw new Error('extraction impossible : ' + name);
  return m[0];
}
// dépendances de parseParams : FLAG, exFor, hintFor, curLang (stub FR)
const flag = html.match(/var FLAG=\/[^\n]+\n/);
const src = [
  'var curLang=function(){return "fr";};',
  flag ? flag[0] : 'var FLAG=/^$/;',
  extract('exFor'), extract('hintFor'),
  extract('splitTop'), extract('splitForms'), extract('parseParams'),
].join('\n');
const ctx = {};
new Function('ctx', src + '\nctx.parseParams=parseParams;ctx.splitTop=splitTop;ctx.splitForms=splitForms;ctx.exFor=exFor;ctx.hintFor=hintFor;')(ctx);
const { parseParams, splitTop, splitForms, exFor } = ctx;

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

console.log('\n' + (n - ko) + '/' + n + ' tests OK');
process.exit(ko ? 1 : 0);
