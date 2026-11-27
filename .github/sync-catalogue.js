'use strict';
// Refresh only catalogue regions from the real bot. Never rebuild the site's theme or scripts.
// Default: read-only preview. --write changes index.html/stats.json; attestation stays separate.
const fs = require('node:fs');
const path = require('node:path');
const checker = require('./check-commands');
const H = require('./html-scripts');
const BADGE_KEYS = { owner: 'accOwner', admin: 'accAdmin', staff: 'accStaff', all: 'accAll' };
const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const maskComments = text => text.replace(/<!--[\s\S]*?-->/g, value => ' '.repeat(value.length));

function endOfElement(html, start, tag) {
  const masked = maskComments(html), re = new RegExp('<' + tag + '\\b|</' + tag + '\\s*>', 'g');
  re.lastIndex = start;
  let depth = 0, match;
  while ((match = re.exec(masked))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) return match.index + match[0].length;
  }
  throw Error('Élément de catalogue incomplet : ' + tag);
}
function sectionsOf(html) {
  const re = /<section\b[^>]*\bid="c(\d+)"[^>]*>/g, masked = maskComments(html), result = [];
  let match;
  while ((match = re.exec(masked))) {
    const end = endOfElement(html, match.index, 'section'), index = Number(match[1]);
    if (result.some(section => section.index === index)) throw Error('Section de catalogue en double.');
    result.push({ start: match.index, end, index, html: html.slice(match.index, end), color: (match[0].match(/--cc:\s*([^;" ]+)/) || [])[1] });
    re.lastIndex = end;
  }
  return result;
}
function cardsOf(section) {
  const re = /<div\b[^>]*\bclass="cmd"[^>]*>/g, masked = maskComments(section.html), result = [];
  let match;
  while ((match = re.exec(masked))) {
    const name = (match[0].match(/\bdata-n="([a-zA-Z0-9_-]+)"/) || [])[1], end = endOfElement(section.html, match.index, 'div');
    if (!name) throw Error('Carte de commande sans nom.');
    result.push({ name, section: section.index, html: section.html.slice(match.index, end) });
    re.lastIndex = end;
  }
  return result;
}
function navOf(html) {
  const match = /<div\b[^>]*\bid="catnav"[^>]*>/.exec(maskComments(html));
  if (!match) throw Error('Navigation du catalogue absente.');
  const end = endOfElement(html, match.index, 'div');
  return { start: match.index, end, html: html.slice(match.index, end) };
}
function replaceRegions(html, regions) {
  let previous = html.length + 1;
  for (const region of [...regions].sort((a, b) => b.start - a.start)) {
    if (region.end > previous) throw Error('Zones du catalogue superposées.');
    html = html.slice(0, region.start) + region.value + html.slice(region.end);
    previous = region.start;
  }
  return html;
}
function counters(html, count, categories) {
  const cards = [...maskComments(html).matchAll(/<div\b[^>]*\bclass="cmd"[^>]*>/g)]
    .map(match => (match[0].match(/\bdata-cat="(\d+)"/) || [])[1]);
  return html
    .replace(/(<b\b[^>]*\bid="bCmds"[^>]*>)\d+(<\/b>)/g, `$1${count}$2`)
    .replace(/(<b\b[^>]*\bid="bCats"[^>]*>)\d+(<\/b>)/g, `$1${categories}$2`)
    .replace(/(<span\b[^>]*\bdata-src="bCmds"[^>]*>)\d+(<\/span>)/g, `$1${count}$2`)
    .replace(/(<span\b[^>]*\bdata-src="bCats"[^>]*>)\d+(<\/span>)/g, `$1${categories}$2`)
    .replace(/(<b\b[^>]*\bid="hp-afig-c"[^>]*>)\d+(<\/b>)/g, `$1${count}$2`)
    .replace(/(<b data-count="(\d+)">)\d+(<\/b>)/g, (_, tag, category, close) =>
      tag + (count === '#' ? '#' : cards.filter(value => value === category).length) + close);
}
function countPromises(html, value) {
  let zone = checker.zoneProse(html);
  const regions = [];
  // A count mentioned by a command is its own content, not the site's global promise.
  for (const region of [...sectionsOf(html), navOf(html)]) zone = zone.slice(0, region.start)
    + ' '.repeat(region.end - region.start) + zone.slice(region.end);
  for (const match of zone.matchAll(/\b\d{1,4}(?=\s*(?:commandes?|commands?)\b)/gi)) {
    regions.push({ start: match.index, end: match.index + match[0].length, value: String(value) });
  }
  return replaceRegions(html, regions);
}
function maskedCatalogue(html) {
  const sections = sectionsOf(html), nav = navOf(html);
  html = replaceRegions(html, [...sections.map(s => ({ ...s, value: `<section id="c${s.index}">CATALOGUE</section>` })), { ...nav, value: '<div id="catnav">CATEGORIES</div>' }]);
  return countPromises(counters(html, '#', '#'), '#');
}
function cardWithAccess(card, category, color, tier, labels) {
  if (!Object.hasOwn(BADGE_KEYS, tier) || typeof labels[tier] !== 'string') throw Error('Palier d’accès inconnu pour ' + card.name);
  const opening = /^<div\b[^>]*>/.exec(card.html);
  if (!opening) throw Error('Carte source illisible.');
  let tag = opening[0];
  for (const [key, value] of Object.entries({ 'data-cat': category, 'data-c': color, 'data-acc': tier })) {
    const re = new RegExp('\\b' + key + '="[^"]*"', 'g');
    if ([...tag.matchAll(re)].length !== 1) throw Error('Attribut de carte source absent ou ambigu : ' + key);
    tag = tag.replace(re, `${key}="${escape(value)}"`);
  }
  // cmdDesc() reads the bilingual .desc element; duplicating its text bloats every card.
  tag = tag.replace(/\sdata-d(?:-en)?="[^"]*"/g, '');
  let html = tag + card.html.slice(opening[0].length);
  const badge = /<span\b[^>]*\bclass="accb acc-[^"]*"[^>]*>[\s\S]*?<\/span>/g;
  const matches = [...maskComments(html).matchAll(badge)];
  if (matches.length !== 1) throw Error('Badge d’accès source absent ou ambigu.');
  const match = matches[0];
  html = html.slice(0, match.index) + `<span class="accb acc-${tier}" data-i18n="${BADGE_KEYS[tier]}">${escape(labels[tier])}</span>` + html.slice(match.index + match[0].length);
  // The current site reads usage.dataset.en, while docs-build puts it on the outer card.
  let usageEn = (opening[0].match(/\bdata-u-en="([^"]*)"/) || [])[1];
  if (usageEn?.trim()) {
    const usages = [...maskComments(html).matchAll(/<div\b[^>]*\bclass="usage"[^>]*>/g)];
    const first = /^\+?([a-z0-9_-]+)(?=\s|$)/i.exec(usageEn);
    const aliasText = (maskComments(html).match(/<span class="al">([^<]*)<\/span>/) || [])[1] || '';
    const aliases = [...aliasText.matchAll(/\+([a-z0-9_-]+)/gi)].map(m => m[1]);
    if (usages.length !== 1 || !first || (first[1] !== card.name && !aliases.includes(first[1]))) throw Error('Usage anglais absent ou étranger : ' + card.name);
    usageEn = '+' + card.name + usageEn.slice(first[0].length);
    const usage = usages[0], tag = usage[0].replace(/\sdata-en="[^"]*"/g, '').replace(/>$/, ` data-en="${usageEn}">`);
    html = html.slice(0, usage.index) + tag + html.slice(usage.index + usage[0].length);
  }
  return html;
}

function syncCatalogue({ html, generated, model, stats }) {
  html = H.normalize(html); generated = H.normalize(generated);
  const original = html, oldSections = sectionsOf(html), newSections = sectionsOf(generated);
  const expected = model?.vivantes;
  if (!Array.isArray(expected) || !expected.length || new Set(expected).size !== expected.length) throw Error('Modèle de commandes invalide.');
  if (!oldSections.length || oldSections.length !== newSections.length || newSections.length !== model.ordreCategories?.length
    || oldSections.some((s, i) => s.index !== i || !s.color) || newSections.some((s, i) => s.index !== i)) throw Error('Sections de catalogue incompatibles.');
  const oldCards = oldSections.flatMap(cardsOf), freshCards = newSections.flatMap(cardsOf);
  if (new Set(freshCards.map(c => c.name)).size !== freshCards.length) throw Error('Carte source en double.');
  if (JSON.stringify(freshCards.map(c => c.name).sort()) !== JSON.stringify([...expected].sort())) throw Error('Source du catalogue incomplète ou étrangère.');
  const labels = checker.libellesAcces(html), moves = checker.deplacementsDuSite(html);
  if (!labels || moves === null) throw Error('Libellés d’accès ou déplacements illisibles.');
  const groups = newSections.map(() => []);
  for (const card of freshCards) {
    const target = model.categories[card.name];
    if (!Number.isInteger(target) || !groups[target] || target !== card.section) throw Error('Catégorie source incohérente : ' + card.name);
    let physical = target;
    if (Object.hasOwn(moves, card.name)) {
      const previous = oldCards.filter(c => c.name === card.name);
      if (moves[card.name] !== target || previous.length !== 1 || previous[0].section === target) throw Error('Déplacement périmé ou sans identité certaine : ' + card.name);
      physical = previous[0].section;
    }
    groups[physical].push(cardWithAccess(card, physical, oldSections[physical].color, model.acces[card.name], labels));
  }
  for (const name of Object.keys(moves)) if (!expected.includes(name)) throw Error('Déplacement sans commande : ' + name);
  const regions = oldSections.map((section, i) => {
    const fresh = newSections[i].html, grid = /<div\b[^>]*\bclass="grid"[^>]*>/.exec(maskComments(fresh));
    if (!grid) throw Error('Grille source absente.');
    const end = endOfElement(fresh, grid.index, 'div');
    let head = fresh.slice(0, grid.index).replace(/--cc:\s*[^;" ]+/, '--cc:' + section.color);
    const count = /(<span\b[^>]*>\s*)\(\d+\)(\s*<\/span>)/;
    if (!count.test(head)) throw Error('Compteur de section source absent.');
    head = head.replace(count, `$1(${groups[i].length})$2`);
    return { ...section, value: head + '<div class="grid">' + groups[i].join('') + '</div>' + fresh.slice(end) };
  });
  const oldNav = navOf(html), newNav = navOf(generated);
  html = replaceRegions(html, [...regions, { ...oldNav, value: newNav.html }]);
  html = countPromises(counters(html, expected.length, groups.length), expected.length);
  if (maskedCatalogue(original) !== maskedCatalogue(html)) throw Error('Une zone hors catalogue a changé.');
  const beforeScripts = H.scripts(original).filter(s => s.executable).map(s => s.body);
  const afterScripts = H.scripts(html).filter(s => s.executable).map(s => s.body);
  if (JSON.stringify(beforeScripts) !== JSON.stringify(afterScripts)) throw Error('Un script du site a changé.');
  return { html, stats: { ...stats, commands: expected.length, categories: groups.length }, report: {
    commands: expected.length, categories: groups.length,
    added: expected.filter(n => !oldCards.some(c => c.name === n)), removed: oldCards.filter(c => !expected.includes(c.name)).map(c => c.name),
    themeAndScriptsPreserved: true,
  } };
}

function main(args = process.argv.slice(2)) {
  const at = args.indexOf('--bot'), bot = at >= 0 && args[at + 1], write = args.includes('--write');
  if (!bot || args.some((arg, i) => !['--bot', '--write'].includes(arg) && args[i - 1] !== '--bot')) throw Error('Usage : --bot racine [--write]');
  const root = path.resolve(__dirname, '..'), source = path.resolve(bot);
  const model = checker.commandesDuBot(source);
  const build = require(path.join(source, 'tools/docs-build.js'))({ ecrire: false });
  const index = path.join(root, 'index.html'), statsFile = path.join(root, 'stats.json');
  const result = syncCatalogue({ html: fs.readFileSync(index, 'utf8'), generated: build.rendus['index.html'], model, stats: JSON.parse(fs.readFileSync(statsFile, 'utf8')) });
  if (write) { fs.writeFileSync(index, result.html); fs.writeFileSync(statsFile, JSON.stringify(result.stats) + '\n'); }
  console.log(JSON.stringify({ ...result.report, written: write }));
  return result;
}
module.exports = { syncCatalogue, main };
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
