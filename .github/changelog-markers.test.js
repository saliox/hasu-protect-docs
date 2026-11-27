'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const root = path.join(__dirname, '..');
function block(html) {
  const start = html.indexOf('<div class="changelog">'), re = /<div\b|<\/div>/g; re.lastIndex = start;
  let depth = 0, m; while ((m = re.exec(html))) { depth += m[0] === '</div>' ? -1 : 1; if (!depth) return html.slice(start, re.lastIndex); }
  throw Error('Incomplete changelog');
}
test('the real skin renders autonomous code markers in both languages without changing other summaries', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hasu-changelog-markers-'));
  try {
    const src = path.join(dir, 'input.html'), out = path.join(dir, 'output.html');
    const outside = '<details id="outside-marker-test"><summary>+ <strong>Outside</strong></summary>Body</details>';
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<summary><code>([+-])<\/code> /g, '<summary>$1 ')
      .replace('</body>', outside + '\n</body>');
    fs.writeFileSync(src, html);
    cp.execFileSync(process.execPath, [path.join(root, 'habillage/habiller.js'), src, out]);
    const result = fs.readFileSync(out, 'utf8'), featured = block(result), original = block(html);
    const count = (original.match(/<summary>[+-] <strong>/g) || []).length;
    assert(count > 0); assert.equal((featured.match(/<summary><code>[+-]<\/code> <strong>/g) || []).length, count);
    assert(!/<summary>[+-] <strong>/.test(featured)); assert(result.includes(outside));
    assert.equal(featured.replace(/<code>([+-])<\/code> (?=<strong>)/g, '$1 '), original, 'only the autonomous marker markup changes');
    cp.execFileSync(process.execPath, [path.join(root, 'habillage/habiller.js'), out, src]);
    assert.equal(fs.readFileSync(src, 'utf8'), result, 'the skin remains idempotent');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('a removal marker is rendered as code while text and command code stay unchanged', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hasu-changelog-minus-'));
  try {
    const src = path.join(dir, 'input.html'), out = path.join(dir, 'output.html');
    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    html = html.replace(/<summary>(?:<code>[+-]<\/code>|[+-]) <strong>/, '<summary>- <strong>');
    const expected = (block(html).match(/<summary>(?:<code>-<\/code>|-) <strong>/g) || []).length;
    fs.writeFileSync(src, html); cp.execFileSync(process.execPath, [path.join(root, 'habillage/habiller.js'), src, out]);
    const result = block(fs.readFileSync(out, 'utf8'));
    assert(expected > 0); assert.equal((result.match(/<summary><code>-<\/code> <strong>/g) || []).length, expected);
    assert.equal((result.match(/<code>\+purge @membre 10 pins<\/code>/g) || []).length, (block(html).match(/<code>\+purge @membre 10 pins<\/code>/g) || []).length);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
