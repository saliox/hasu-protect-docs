// ── Source UNIQUE de vérité : « que le navigateur exécute-t-il dans index.html ? »
//
// Deux gardes se posaient la question chacun de leur côté, avec deux réponses différentes :
//   • check-csp.js  cherchait /<script>…<\/script>/  → aveugle à <script defer>, <script id=…> :
//     il restait VERT sur un script que la CSP bloque (reproduit le 30/08 : « script defer » ajouté,
//     check-csp exit 0, Chrome « Executing inline script violates … The action has been blocked »).
//   • unit-tests.js cherchait « function X( » dans TOUT le fichier → il pouvait tester un LEURRE
//     (fonction citée dans un commentaire HTML, un attribut, l'historique) et afficher 48/48 pendant
//     que le code déployé était cassé (reproduit le 30/08 sur md()).
// Les deux dérivent maintenant d'ici. Un garde qui ment est pire que pas de garde.
'use strict';

// Le parseur HTML normalise CRLF → LF dans le flux d'entrée AVANT de constituer le texte du script :
// c'est donc sur la version LF que le navigateur calcule le hash CSP et exécute le code.
// (Git sert du LF ; une copie de travail Windows en CRLF donnerait un faux négatif.)
function normalize(html) { return String(html).replace(/\r\n/g, '\n'); }

const TAG = /<script(|\s[^>]*?)>([\s\S]*?)<\/script\s*>/gi;

// Types que le navigateur EXÉCUTE (HTML Standard, « classic »/« module » script).
const JS_TYPE = /^(|text\/javascript|application\/javascript|text\/ecmascript|application\/ecmascript|module)$/i;
// Types INERTES connus : blocs de données, ni exécutés ni soumis à script-src.
const DATA_TYPE = /^(application\/ld\+json|application\/json|text\/template|text\/html|text\/plain|importmap|speculationrules)$/i;

function attrsOf(raw) {
  const out = {};
  const re = /([A-Za-z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(raw))) out[m[1].toLowerCase()] = (m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '');
  return out;
}

// Tous les <script> du document, classés. `executable` est PRUDENT : un type inconnu est
// considéré exécutable, pour que le garde crie au lieu de laisser passer.
function scripts(html) {
  const src = normalize(html);
  const out = [];
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(src))) {
    const attrs = attrsOf(m[1] || '');
    const type = (attrs.type || '').trim();
    out.push({
      index: m.index,
      attrs,
      type,
      body: m[2],
      external: Object.prototype.hasOwnProperty.call(attrs, 'src'),
      inert: DATA_TYPE.test(type),
      executable: JS_TYPE.test(type) || !DATA_TYPE.test(type),
    });
  }
  return out;
}

// LE bloc inline exécutable — le code réellement déployé, celui que les tests unitaires doivent lire.
// S'il y en a zéro ou plusieurs, on refuse de deviner : un harnais qui choisit au hasard ment.
function theInlineScript(html) {
  const inline = scripts(html).filter((s) => s.executable && !s.external);
  if (inline.length !== 1) {
    throw new Error(
      'index.html : ' + inline.length + ' <script> inline exécutable(s) trouvé(s), 1 attendu. ' +
      'Le harnais ne sait plus lequel est le code déployé — adapte html-scripts.js AVANT de continuer.'
    );
  }
  return inline[0].body;
}

// ── Extraction d'une fonction par ÉQUILIBRAGE DES ACCOLADES.
// L'ancien ancrage s'arrêtait au premier saut de ligne suivi de « function / var / // / (function » :
// il avalait la fonction voisine dès qu'elle changeait de forme (const, let, une ligne vide…).
// Ici on lit le vrai corps, en sautant chaînes, gabarits, commentaires et littéraux d'expression
// régulière (le corps de md() contient des accents graves DANS une regex : /`([^`]+)`/g).
const REGEX_KEYWORD = /(?:^|[^\w$])(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

function canStartRegex(src, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  if (j < 0) return true;
  const c = src[j];
  if (/[\w$)\]]/.test(c)) return REGEX_KEYWORD.test(src.slice(Math.max(0, j - 12), j + 1));
  return true; // ( , = : [ ! & | ? { } ; + - * / % < > ~ ^
}

function endOfBlock(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); if (i < 0) return -1; i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '/' && canStartRegex(src, i)) {
      i++;
      let cls = false;
      while (i < src.length) {
        const d = src[i];
        if (d === '\\') { i += 2; continue; }
        if (d === '[') cls = true;
        else if (d === ']') cls = false;
        else if (d === '/' && !cls) break;
        else if (d === '\n') return -1; // pas une regex après tout : on refuse de deviner
        i++;
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// Balaie le script en sautant chaînes / commentaires / regex et rend, pour chaque déclaration
// « function NOM( », sa position ET sa profondeur d'accolades.
// La profondeur compte : le script définit paint/close/show DEUX fois chacune, mais dans deux IIFE
// différentes — ce ne sont pas des doublons, elles ne se masquent pas. Seules les déclarations de
// PREMIER NIVEAU (profondeur 0) partagent une portée, et là la dernière écrase les précédentes.
function scanDeclarations(src) {
  const out = [];
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { const n = src.indexOf('\n', i); if (n < 0) break; i = n; continue; }
    if (c === '/' && src[i + 1] === '*') { const n = src.indexOf('*/', i + 2); if (n < 0) break; i = n + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '/' && canStartRegex(src, i)) {
      let j = i + 1, cls = false, done = false;
      while (j < src.length) { const d = src[j]; if (d === '\\') { j += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) { done = true; break; } else if (d === '\n') break; j++; }
      if (done) { i = j; continue; }
    }
    if (c === '{') { depth++; continue; }
    if (c === '}') { depth--; continue; }
    if (c === 'f' && /^function\s+([A-Za-z_$][\w$]*)\s*\(/.test(src.slice(i, i + 80)) && (i === 0 || !/[\w$.]/.test(src[i - 1]))) {
      out.push({ name: /^function\s+([A-Za-z_$][\w$]*)/.exec(src.slice(i, i + 80))[1], index: i, depth });
    }
  }
  return out;
}

// Déclarations de `name` au PREMIER NIVEAU du script (celles qui se masquent entre elles).
function declarationsOf(src, name) {
  return scanDeclarations(src).filter((d) => d.name === name && d.depth === 0).map((d) => d.index);
}

// Extrait LA définition de `name`. Refuse 0 définition (le test porterait sur du vide) comme
// plusieurs (le harnais testerait la PREMIÈRE, le navigateur exécute la DERNIÈRE — reproduit
// le 30/08 : deuxième escH() sans échappement ajoutée plus bas, 48/48 quand même).
function extractFunction(src, name) {
  const hits = declarationsOf(src, name);
  if (!hits.length) {
    const nested = scanDeclarations(src).filter((d) => d.name === name);
    throw new Error(nested.length
      ? 'extraction impossible : « function ' + name + '( » n\'existe qu\'en portée LOCALE (profondeur ' + nested.map((d) => d.depth).join('/') + ') — non testable telle quelle.'
      : 'extraction impossible : aucune définition de « function ' + name + '( » dans le <script> déployé.');
  }
  if (hits.length > 1) {
    throw new Error(
      'extraction ambiguë : ' + hits.length + ' définitions de « function ' + name + '( » au PREMIER NIVEAU du <script> déployé. ' +
      'Le harnais testerait la 1re, le navigateur exécute la DERNIÈRE. Supprime le doublon.'
    );
  }
  const start = hits[0];
  const paren = src.indexOf('(', start);
  let depth = 0, i = paren, close = -1;
  for (; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') { depth--; if (!depth) { close = i; break; } }
  }
  if (close < 0) throw new Error('extraction impossible : liste de paramètres non fermée pour ' + name);
  const open = src.indexOf('{', close);
  if (open < 0) throw new Error('extraction impossible : corps introuvable pour ' + name);
  const end = endOfBlock(src, open);
  if (end < 0) throw new Error('extraction impossible : accolades non équilibrées dans ' + name + ' (chaîne ou regex mal lue ?)');
  return src.slice(start, end + 1);
}

// Une déclaration `var NOM=…;` de premier niveau, terminée par le ; de premier niveau.
function extractVar(src, name) {
  const re = new RegExp('(^|[^\\w$.])var\\s+' + name + '\\s*=', 'g');
  const hits = [];
  let m;
  while ((m = re.exec(src))) hits.push(m.index + m[1].length);
  if (!hits.length) throw new Error('extraction impossible : aucune déclaration « var ' + name + '= » dans le <script> déployé.');
  if (hits.length > 1) throw new Error('extraction ambiguë : ' + hits.length + ' déclarations de « var ' + name + '= ».');
  const start = hits[0];
  for (let i = src.indexOf('=', start) + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && canStartRegex(src, i)) {
      i++; let cls = false;
      while (i < src.length) { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; i++; }
      continue;
    }
    if (c === '{' || c === '[' || c === '(') { const e = endOfBalanced(src, i); if (e < 0) break; i = e; continue; }
    if (c === ';' || c === '\n') return src.slice(start, i) + ';';
  }
  throw new Error('extraction impossible : fin de « var ' + name + '= » introuvable.');
}

function endOfBalanced(src, open) {
  const pairs = { '{': '}', '[': ']', '(': ')' };
  const want = pairs[src[open]];
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === src[open]) depth++;
    else if (c === want) { depth--; if (!depth) return i; }
  }
  return -1;
}

// Tous les noms de fonctions déclarées dans le script (pour les auto-contrôles du harnais).
function functionNames(src) {
  return [...new Set([...src.matchAll(/(?:^|[^\w$.])function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))];
}

module.exports = { normalize, scripts, theInlineScript, extractFunction, extractVar, functionNames, declarationsOf, JS_TYPE, DATA_TYPE };
