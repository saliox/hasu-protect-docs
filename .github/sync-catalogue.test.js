'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const checker = require('./check-commands');
const tool = fs.existsSync(path.join(__dirname, 'sync-catalogue.js')) ? require('./sync-catalogue') : {};
const colors = ['#111111', '#222222', '#333333'];
const labels = { owner: 'Owner', admin: 'Admin', staff: 'Staff', all: 'Everyone' };
const keys = { owner: 'accOwner', admin: 'accAdmin', staff: 'accStaff', all: 'accAll' };
const card = (name, category, tier = 'all') => `<div class="cmd" data-n="${name}" data-cat="${category}" data-c="${colors[category]}" data-acc="${tier}"><div class="name">+${name}<span class="accb acc-${tier}" data-i18n="${keys[tier]}">${labels[tier]}</span></div><div class="desc">Current ${name}</div><div class="usage">+${name}</div></div>`;
const sections = groups => groups.map((names, i) => `<section id="c${i}" style="--cc:${colors[i]}"><h2 class="cat"><span>Category ${i}</span> <span>(${names.length})</span></h2><div class="grid">${names.map(n => card(n, i)).join('')}</div></section>`).join('');
function fixture() {
  const original = '<!doctype html><meta name="description" content="4 commands">'
    + '<style>.custom{color:purple}</style><header id="theme">Keep this theme</header>'
    + '<span data-src="bCmds">4</span><b id="bCmds">4</b><b id="bCats">3</b>'
    + '<div class="changelog"><div class="ver">Published today</div><p>4 commands in the old release</p></div><div class="quickstart">Keep this guide</div>'
    + '<div class="nav" id="catnav"><button>Old categories</button></div>'
    + sections([['alpha', 'beta'], ['update'], ['obsolete']])
    + '<section id="faq"><p>All 4 commands are documented.</p></section>'
    + `<script>var I18N={${Object.entries(keys).map(([tier, key]) => `${key}:{fr:'${labels[tier]}',en:'${labels[tier]}'}`).join(',')}};var MOVES={beta:'2'};/* 99 commands in a code comment */</script>`;
  const generated = '<div class="nav" id="catnav"><button>Current categories</button></div>' + sections([['gamma'], ['alpha'], ['beta']]);
  const model = { vivantes: ['alpha', 'beta', 'gamma'], acces: { alpha: 'owner', beta: 'admin', gamma: 'all' }, categories: { alpha: 1, beta: 2, gamma: 0 }, ordreCategories: ['A', 'B', 'C'] };
  const stats = { commands: 4, categories: 3, heartbeat: 123, servers: 7, mastery: 81, privateFixture: { untouched: true } };
  return { html: original, generated, model, stats };
}
function sync(f) { assert.equal(typeof tool.syncCatalogue, 'function'); return tool.syncCatalogue(f); }

test('synchronization adds missing commands, removes deleted ones and uses actual access tiers', () => {
  const f = fixture(), r = sync(f), cards = checker.cartesDe(r.html);
  assert.deepEqual(cards.noms.sort(), f.model.vivantes);
  assert(!r.html.includes('data-n="update"'));
  const alpha = cards.detail.find(c => c.nom === 'alpha');
  assert.equal(alpha.acc, 'owner');
  assert.equal(alpha.badgeClasse, 'owner');
  assert.equal(alpha.badgeCle, 'accOwner');
  assert.equal(alpha.badgeTexte, 'Owner');
  assert.equal(alpha.section, 1);
});

test('existing valid client-side moves retain coherent physical and effective categories', () => {
  const r = sync(fixture()), beta = checker.cartesDe(r.html).detail.find(c => c.nom === 'beta');
  assert.equal(beta.section, 0);
  assert.equal(beta.cat, '0');
  assert.equal(beta.couleur, colors[0]);
  assert.equal(checker.deplacementsDuSite(r.html).beta, 2);
});

test('theme, scripts, guide and changelog stay intact while current count promises are updated', () => {
  const f = fixture(), r = sync(f);
  assert(r.html.includes('<header id="theme">Keep this theme</header>'));
  assert(r.html.includes('<style>.custom{color:purple}</style>'));
  assert(r.html.includes('<div class="quickstart">Keep this guide</div>'));
  assert(r.html.includes('4 commands in the old release'));
  assert(r.html.includes('99 commands in a code comment'));
  assert(r.html.includes('content="3 commands"'));
  assert(r.html.includes('All 3 commands are documented.'));
  assert(r.html.includes('id="bCmds">3</b>'));
  assert(r.html.includes('data-src="bCmds">3</span>'));
  assert.equal(r.html.match(/<script>[\s\S]*?<\/script>/)[0], f.html.match(/<script>[\s\S]*?<\/script>/)[0]);
});

test('only catalogue counts change in public statistics; no heartbeat or Guardian data is invented', () => {
  const f = fixture(), r = sync(f);
  assert.deepEqual(r.stats, { ...f.stats, commands: 3, categories: 3 });
  assert.equal(f.stats.commands, 4, 'input statistics are not mutated');
});

test('the same catalogue can be synchronized twice without changing HTML or statistics', () => {
  const f = fixture(), first = sync(f), second = sync({ ...f, html: first.html, stats: first.stats });
  assert.equal(second.html, first.html);
  assert.deepEqual(second.stats, first.stats);
});

test('an incomplete, duplicated or unknown source never produces a partial catalogue', () => {
  let f = fixture(); f.generated = f.generated.replace(card('gamma', 0), '');
  assert.throws(() => sync(f), /source|command|catalogue/i);
  f = fixture(); f.generated = f.generated.replace(card('gamma', 0), card('gamma', 0) + card('gamma', 0));
  assert.throws(() => sync(f), /double|duplicate|source/i);
  f = fixture(); f.model.acces.alpha = 'unknown';
  assert.throws(() => sync(f), /accès|access|palier/i);
});

test('a stale move or unknown section is refused instead of silently relabeling a command', () => {
  let f = fixture(); f.html = f.html.replace("MOVES={beta:'2'}", "MOVES={beta:'1'}");
  assert.throws(() => sync(f), /move|déplacement|catégorie/i);
  f = fixture(); f.generated = f.generated.replace(/<section id="c2"[\s\S]*?<\/section>/, '');
  assert.throws(() => sync(f), /section|source|catalogue/i);
});

test('HTML comments containing fake cards and sections are preserved, never interpreted as catalogue', () => {
  const f = fixture(), decoy = `<!-- ${sections([['decoy']])} -->`;
  f.html = f.html.replace('<header', decoy + '<header');
  const r = sync(f);
  assert(r.html.includes(decoy));
  assert.equal((r.html.match(/data-n="decoy"/g) || []).length, 1);
});

test('English usage metadata feeds the existing bilingual card and simulation reader', () => {
  const f = fixture();
  f.generated = f.generated.replace('data-n="gamma"', 'data-n="gamma" data-u-en="+gamma &lt;member&gt; [reason]"');
  const r = sync(f), at = r.html.indexOf('data-n="gamma"'), tail = r.html.slice(at);
  assert(tail.includes('<div class="usage" data-en="+gamma &lt;member&gt; [reason]">+gamma</div>'));
  assert.equal(sync({ ...f, html: r.html, stats: r.stats }).html, r.html);
});

test('an English usage may name a documented alias, but never an unrelated command', () => {
  const f = fixture();
  f.generated = f.generated.replace('data-n="gamma"', 'data-n="gamma" data-u-en="+oldgamma &lt;member&gt;"')
    .replace('<div class="name">+gamma', '<div class="name">+gamma<span class="al">alias: +oldgamma</span>');
  assert(sync(f).html.includes('class="usage" data-en="+gamma &lt;member&gt;"'));
  f.generated = f.generated.replace('data-u-en="+oldgamma', 'data-u-en="+unrelated');
  assert.throws(() => sync(f), /anglais|étranger/i);
});

test('an English usage without its prefix is normalized only for the same real command', () => {
  const f = fixture();
  f.generated = f.generated.replace('data-n="gamma"', 'data-n="gamma" data-u-en="gamma &lt;member&gt;"');
  assert(sync(f).html.includes('class="usage" data-en="+gamma &lt;member&gt;"'));
});

test('descriptions stay in their bilingual element without duplicated outer attributes', () => {
  const f = fixture();
  f.generated = f.generated.replace('data-n="gamma"', 'data-n="gamma" data-d="Current gamma" data-d-en="English gamma"')
    .replace('<div class="desc">Current gamma</div>', '<div class="desc" data-fr="Current gamma" data-en="English gamma">Current gamma</div>');
  const r = sync(f);
  assert(!/\sdata-d(?:-en)?=/.test(r.html));
  assert(r.html.includes('class="desc" data-fr="Current gamma" data-en="English gamma">Current gamma</div>'));
});

test('global count updates never rewrite a number inside a command description', () => {
  const f = fixture();
  f.generated = f.generated.replace('Current gamma', 'Runs 4 commands in one workflow.');
  const r = sync(f);
  assert(r.html.includes('Runs 4 commands in one workflow.'));
  assert(r.html.includes('content="3 commands"'));
});
