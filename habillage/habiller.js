// Applique l'habillage (accueil, chiffres, Guardian, invitation, 3D) à l'index.html généré par le bot.
//
// Usage, à la racine du dépôt de la doc :   node habillage/habiller.js
//   → lit index.html, l'habille et le réécrit EN PLACE. Sans effet si la page est déjà habillée.
// Usage avec chemins explicites :           node habillage/habiller.js <source.html> <sortie.html>
//
// Le JavaScript de l'habillage reste un fichier à part (habillage/hp.js, servi par le site) : la page
// garde un seul <script> inline, celui du bot, comme l'attendent check-csp.js et unit-tests.js.
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.join(here, '..');
const src = process.argv[2] || path.join(root, 'index.html');
const out = process.argv[3] || src;
let h = fs.readFileSync(src, 'utf8');
if (h.includes('id="hp-skin"')) { console.log('Déjà habillé, rien à faire :', src); process.exit(0); }

const read = f => fs.readFileSync(path.join(here, f), 'utf8');
const css = read('skin.css'), top = read('top.html'), end = read('end.html');
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const FONTS = 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';
function must(ok, what) { if (!ok) { console.error('Introuvable dans la page : ' + what + ' — habillage NON appliqué.'); process.exit(1); } }

// 1. CSP : 'self' pour habillage/hp.js, cdnjs pour three.js, Google Fonts pour les polices
const cspRe = /(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")/;
must(cspRe.test(h), 'meta Content-Security-Policy');
const add = (list, extra) => list.split(/\s+/).filter(Boolean).concat(extra.filter(x => !list.split(/\s+/).includes(x))).join(' ');
h = h.replace(cspRe, (m, a, c, z) => a + c
  .replace(/script-src ([^;]*)/, (mm, v) => 'script-src ' + add(v, ["'self'", 'https://cdnjs.cloudflare.com']))
  .replace(/style-src ([^;]*)/, (mm, v) => 'style-src ' + add(v, ['https://fonts.googleapis.com']))
  .replace(/font-src ([^;]*)/, (mm, v) => 'font-src ' + add(v, ['https://fonts.gstatic.com'])) + z);

// 2. Polices + feuille d'habillage après la feuille d'origine
must(/<\/style>\s*<\/head>/.test(h), 'fin du <head>');
h = h.replace(/<\/style>\s*<\/head>/, () => '</style>\n<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="' + FONTS + '">\n<style id="hp-skin">\n' + css + '\n</style></head>');

// 3. Chapitres d'ouverture avant l'en-tête, chapitres de fin avant le pied de page
must(/<body>\s*<header>/.test(h), '<body><header>');
h = h.replace(/<body>\s*<header>/, () => '<body>\n' + top + '\n<header>');
must(h.includes('<footer>'), '<footer>');
h = h.replace('<footer>', () => end + '\n<footer>');

// 4. Scripts externes en fin de page (aucun nouveau script inline)
must(/<\/body>\s*<\/html>\s*$/.test(h), '</body></html>');
h = h.replace(/<\/body>\s*<\/html>\s*$/, () => '<script src="' + THREE_URL + '"></script>\n<script src="habillage/hp.js"></script>\n</body></html>\n');

fs.writeFileSync(out, h);
console.log('Habillage appliqué ->', out, (h.length / 1024).toFixed(0) + ' Ko');
