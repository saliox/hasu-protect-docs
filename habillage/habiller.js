// Applique l'habillage (accueil, chiffres, Guardian, invitation, 3D) à l'index.html généré par le bot.
//
// Usage, à la racine du dépôt de la doc :   node habillage/habiller.js
//   → lit index.html, l'habille et le réécrit EN PLACE.
// Usage avec chemins explicites :           node habillage/habiller.js <source.html> <sortie.html>
//
// Réapplicable : chaque bloc injecté est encadré de marqueurs <!--hp:…--> … <!--/hp:…-->. Sur une page
// déjà habillée, les anciens blocs sont retirés puis remplacés par la version actuelle de habillage/ ;
// relancer sans rien changer redonne exactement la même page.
//
// Le JavaScript de l'habillage reste un fichier à part (habillage/hp.js, servi par le site) : la page
// garde un seul <script> inline, celui du bot, comme l'attendent check-csp.js et unit-tests.js.
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.join(here, '..');
const src = process.argv[2] || path.join(root, 'index.html');
const out = process.argv[3] || src;
let h = fs.readFileSync(src, 'utf8');
function must(ok, what) { if (!ok) { console.error('Introuvable dans la page : ' + what + ' — habillage NON appliqué.'); process.exit(1); } }

// 0. Retirer un habillage précédent (blocs balisés)
const before = h;
h = h.replace(/\s*<!--hp:(\w+)-->[\s\S]*?<!--\/hp:\1-->\s*/g, '\n');
must(!h.includes('id="hp-skin"'), 'page habillée sans marqueurs (ancienne version) : repars de la page brute du bot');
const redo = h !== before;

const read = f => fs.readFileSync(path.join(here, f), 'utf8');
const css = read('skin.css'), top = read('top.html'), end = read('end.html');
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const FONTS = 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';

// 1. CSP : 'self' pour habillage/hp.js, cdnjs pour three.js, Google Fonts (ajouts sans doublon)
const cspRe = /(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")/;
must(cspRe.test(h), 'meta Content-Security-Policy');
const add = (list, extra) => { const have = list.split(/\s+/).filter(Boolean); return have.concat(extra.filter(x => !have.includes(x))).join(' '); };
h = h.replace(cspRe, (m, a, c, z) => a + c
  .replace(/script-src ([^;]*)/, (mm, v) => 'script-src ' + add(v, ["'self'", 'https://cdnjs.cloudflare.com']))
  .replace(/style-src ([^;]*)/, (mm, v) => 'style-src ' + add(v, ['https://fonts.googleapis.com']))
  .replace(/font-src ([^;]*)/, (mm, v) => 'font-src ' + add(v, ['https://fonts.gstatic.com'])) + z);

// 2. Polices + feuille d'habillage juste avant </head>
must(/<\/head>/.test(h), '</head>');
h = h.replace(/\s*<\/head>/, () => '\n<!--hp:head--><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="' + FONTS + '">\n<style id="hp-skin">\n' + css + '\n</style><!--/hp:head-->\n</head>');

// 3. Chapitres d'ouverture avant l'en-tête, chapitres de fin avant le pied de page
must(/<body>\s*<header>/.test(h), '<body><header>');
h = h.replace(/<body>\s*<header>/, () => '<body>\n<!--hp:top-->\n' + top + '\n<!--/hp:top-->\n<header>');
must(h.includes('<footer>'), '<footer>');
h = h.replace('<footer>', () => '<!--hp:end-->\n' + end + '\n<!--/hp:end-->\n<footer>');

// 4. Scripts externes en fin de page (aucun nouveau script inline)
must(/<\/body>\s*<\/html>\s*$/.test(h), '</body></html>');
h = h.replace(/\s*<\/body>\s*<\/html>\s*$/, () => '\n<!--hp:js--><script src="' + THREE_URL + '"></script>\n<script src="habillage/hp.js"></script><!--/hp:js-->\n</body></html>\n');

fs.writeFileSync(out, h);
console.log((redo ? 'Habillage mis à jour -> ' : 'Habillage appliqué -> ') + out, (h.length / 1024).toFixed(0) + ' Ko');
