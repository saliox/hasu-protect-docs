'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const checker = require('./check-commands');

test('reapplying the real skin derives total and category counts from the current catalogue', () => {
  const root = path.join(__dirname, '..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hasu-skin-counts-'));
  try {
    const input = path.join(dir, 'input.html'), output = path.join(dir, 'output.html');
    fs.copyFileSync(path.join(root, 'index.html'), input);
    cp.execFileSync(process.execPath, [path.join(root, 'habillage/habiller.js'), input, output]);
    const html = fs.readFileSync(output, 'utf8'), cards = checker.cartesDe(html);
    assert.equal(Number(html.match(/data-src="bCmds">(\d+)/)[1]), cards.noms.length);
    assert.equal(Number(html.match(/id="hp-afig-c">(\d+)/)[1]), cards.noms.length);
    for (const match of html.matchAll(/data-count="(\d+)">(\d+)<\/b>/g)) {
      assert.equal(Number(match[2]), cards.detail.filter(c => c.cat === match[1]).length);
    }
    cp.execFileSync(process.execPath, [path.join(root, 'habillage/habiller.js'), output, input]);
    assert.equal(fs.readFileSync(input, 'utf8'), html, 'a second skin application is identical');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
