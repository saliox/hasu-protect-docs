'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const check = require('./check-commands');

const BOT = path.resolve(__dirname, '..', '..');

function avecSourceSimulee(file, modifier, verifier) {
  const original = fs.readFileSync;
  const cible = path.resolve(file);
  fs.readFileSync = function (nom, ...args) {
    const lu = original.call(this, nom, ...args);
    return path.resolve(String(nom)) === cible && typeof lu === 'string' ? modifier(lu) : lu;
  };
  try { verifier(); } finally { fs.readFileSync = original; }
}

test('la porte catalogue lit les vrais paliers et raccourcis owner du bot sans ouvrir la base', () => {
  const databasePath = require.resolve(path.join(BOT, 'systems', 'database.js'));
  assert.equal(require.cache[databasePath], undefined);

  const commandLevel = check.paliersDuBot(BOT);
  assert.equal(typeof commandLevel, 'function');
  assert.equal(commandLevel('help'), 0);
  assert.equal(commandLevel('ban'), 2);
  assert.equal(typeof commandLevel.estCommandeOwnerOnly, 'function');
  assert.equal(commandLevel.estCommandeOwnerOnly('antiban', { ownerOnly: false }), true);
  assert.equal(commandLevel.estCommandeOwnerOnly('antiwebhook', { ownerOnly: false }), true);
  assert.equal(commandLevel.estCommandeOwnerOnly('quarantine', { ownerOnly: false }), false);
  assert.equal(require.cache[databasePath], undefined);
});

test('le catalogue classe les commandes sensibles selon la porte centrale', () => {
  const bot = check.commandesDuBot(BOT);
  for (const name of ['nuke', 'addrole', 'delrole', 'antiban', 'antiwebhook', 'permissiondiff', 'reglement']) {
    assert.equal(bot.acces[name], 'owner', `+${name}`);
  }
  assert.equal(bot.acces.quarantine, 'admin');
  assert.equal(bot.acces.help, 'all');
});

test('la disparition de la porte owner du repartiteur arrete l attestation', () => {
  avecSourceSimulee(path.join(BOT, 'index.js'),
    src => src.replace('} else if (estCommandeOwnerOnly(commandName, command)) {', '} else if (false) {'),
    () => assert.throws(() => check.paliersDuBot(BOT), /porte owner centrale/));
});

test('une nouvelle dependance de la feuille antiraid est refusee sans charger son module', () => {
  avecSourceSimulee(path.join(BOT, 'systems', 'raidcatalog.js'),
    src => "require('fs');\n" + src,
    () => assert.throws(() => check.paliersDuBot(BOT), /cette feuille doit être réévaluée/));
  assert.equal(require.cache[require.resolve(path.join(BOT, 'systems', 'database.js'))], undefined);
});
