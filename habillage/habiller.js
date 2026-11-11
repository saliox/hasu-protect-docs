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
const css = read('skin.css'), top = read('top.html') + '\n' + read('guide.html'), end = read('end.html');
// three.js et les polices sont servis par le site lui-même (habillage/vendor, habillage/fonts) :
// aucun CDN autorisé dans la CSP, aucune adresse IP de visiteur envoyée à Google.

// 1. CSP : seulement 'self' en plus (habillage/hp.js, three.js) ; on retire les hôtes d'anciennes versions
const cspRe = /(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")/;
must(cspRe.test(h), 'meta Content-Security-Policy');
const OLD = ['https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
const add = (list, extra) => { const have = list.split(/\s+/).filter(Boolean).filter(x => !OLD.includes(x)); return have.concat(extra.filter(x => !have.includes(x))).join(' '); };
h = h.replace(cspRe, (m, a, c, z) => a + c
  .replace(/script-src ([^;]*)/, (mm, v) => 'script-src ' + add(v, ["'self'"]))
  .replace(/style-src ([^;]*)/, (mm, v) => 'style-src ' + add(v, []))
  .replace(/font-src ([^;]*)/, (mm, v) => 'font-src ' + add(v, [])) + z);

// 2. Polices + feuille d'habillage juste avant </head>
must(/<\/head>/.test(h), '</head>');
h = h.replace(/\s*<\/head>/, () => '\n<!--hp:head--><link rel="stylesheet" href="habillage/fonts.css">\n<style id="hp-skin">\n' + css + '\n</style><!--/hp:head-->\n</head>');

// 3. Chapitres d'ouverture avant l'en-tête, chapitres de fin avant le pied de page
must(/<body>\s*<header>/.test(h), '<body><header>');
h = h.replace(/<body>\s*<header>/, () => '<body>\n<!--hp:top-->\n' + top + '\n<!--/hp:top-->\n<header>');
const foot = h.lastIndexOf('<footer>');   // le DERNIER <footer> : celui de la page, pas un texte qui le citerait plus haut
must(foot > 0, '<footer>');
h = h.slice(0, foot) + '<!--hp:end-->\n' + end + '\n<!--/hp:end-->\n' + h.slice(foot);

// 4. Scripts externes, différés, en fin de page (aucun nouveau script inline). S'ils ne chargent pas,
//    la page reste complète : l'écran de chargement s'efface seul en CSS (voir skin.css, .hp-loader).
must(/<\/body>\s*<\/html>\s*$/.test(h), '</body></html>');
h = h.replace(/\s*<\/body>\s*<\/html>\s*$/, () => '\n<!--hp:js--><script src="habillage/vendor/three.min.js" defer></script>\n<script src="habillage/hp.js" defer></script><!--/hp:js-->\n</body></html>\n');

fs.writeFileSync(out, h);
console.log((redo ? 'Habillage mis à jour -> ' : 'Habillage appliqué -> ') + out, (h.length / 1024).toFixed(0) + ' Ko');
