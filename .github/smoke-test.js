// Smoke test E2E (CI) : ouvre le site déployable dans un vrai Chromium et vérifie ce que les
// contrôles statiques (hash CSP, sentinelle, tests unitaires) ne peuvent pas voir — page qui
// charge sans erreur JS, modale qui s'ouvre, historique à la demande, pas de débordement mobile,
// boîte du changelog de taille saine (le bug du « contour doré » de 34 000 px serait bloqué ici).
// Les hôtes externes sont bouchés : le test est hermétique et rapide.
const { chromium } = require('playwright');
let fails = 0;
// ── Fixture du battement (le 404 qui rougissait « zéro erreur JS ») ────────────────────────────
// index.html:2160 : en https: la page lit le heartbeat de l'hébergeur ; en http: — le serveur local
// du smoke — elle bascule volontairement sur '/heartbeat.json' RELATIF, que python3 -m http.server
// ne sert pas. 404 → console error → assertion rouge, alors que le site n'a aucun défaut.
// On le BOUCHE ici, comme les hôtes externes le sont déjà juste en dessous : le dépôt ne gagne AUCUN
// fichier. Sa racine EST la racine publiée (Pages main/root) — un heartbeat.json commité serait servi
// en clair sur https://saliox.github.io/hasu-protect-docs/heartbeat.json : un faux état du bot à une
// URL publique de la doc, et une cible d'ingestion pour build-uptime.js / build-growth.js.
// « at » CALCULÉ à chaque requête, jamais figé : un horodatage en dur franchirait le seuil des 10 min
// de setStatus et ferait rougir le test tout seul. HB() est appelée, pas capturée.
const HB = () => JSON.stringify({ at: Date.now(), status: 'online', servers: 20, members: 4340, commands: 260, categories: 7 });
const ok = (c, l) => { console.log((c ? 'ok - ' : 'NOT OK - ') + l); if (!c) fails++; };

(async () => {
  // CHROME_PATH : exécution locale avec un Chromium déjà présent (le CI installe le sien).
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext({ locale: 'fr-FR', colorScheme: 'dark' });
  // Le $ final attrape '/heartbeat.json' (serveur local) ET celui de l'hébergeur en https:, mais PAS
  // '…/contents/heartbeat.json?ref=status' de l'API GitHub, qui doit rester sur son propre stub.
  // Route posée sur le CONTEXTE et non sur la page : index.html enregistre sw.js, et seul
  // context.route() couvre aussi le trafic qui transite par un service worker. Ne pas déplacer.
  await ctx.route(/\/heartbeat\.json$/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: HB() }));
  await ctx.route(/abacus|raw\.githubusercontent|api\.github|top\.gg/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"value":1}' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::|CORS|frame-ancestors/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });

  await page.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);

  ok((await page.locator('.cmd').count()) >= 150, 'les cartes de commandes sont rendues');
  ok((await page.locator('.hentry').count()) === 0, 'historique non inliné (scission préservée)');

  // Le bug du contour : la boîte du changelog ne doit jamais avaler la page.
  const cl = await page.evaluate(() => {
    const c = document.querySelector('.changelog');
    return { h: Math.round(c.getBoundingClientRect().height), swallow: c.contains(document.getElementById('search')) };
  });
  ok(cl.h < 3000 && !cl.swallow, 'boîte du changelog saine (' + cl.h + 'px, rien d\'avalé)');

  await page.click('.cmd[data-n="shield"], .cmd', { timeout: 5000 });
  await page.waitForTimeout(300);
  ok((await page.locator('#ov.open .m-name').count()) === 1, 'la modale de commande s\'ouvre');
  await page.keyboard.press('Escape');

  await page.click('#moreBtn');
  await page.waitForTimeout(800);
  ok((await page.locator('.hentry').count()) > 10, 'l\'historique se charge à la demande');

  await page.fill('#search', 'ban');
  await page.waitForTimeout(400);
  ok((await page.evaluate(() => document.querySelectorAll('.cmd').length - [...document.querySelectorAll('.cmd')].filter((c) => c.style.display === 'none').length)) > 0, 'la recherche filtre');

  // Chemin NOMINAL du badge, que rien ne couvrait jusqu'ici : battement frais → « En ligne » (classe
  // `on`). Sans la fixture ci-dessus il n'était même pas atteignable — le 404 partait sur le repli API,
  // puis stats.json (heartbeat du build, vieux de plusieurs jours en CI) laissait le badge finir en
  // « Hors ligne » sans que personne ne le voie. pollHB part à t+1500 ms : on ATTEND l'état au lieu de
  // dormir, et l'échec d'attente retombe en NOT OK lisible plutôt qu'en exception.
  await page.waitForFunction(() => document.getElementById('botstatus').classList.contains('on'), null, { timeout: 8000 }).catch(() => { });
  ok(await page.evaluate(() => document.getElementById('botstatus').classList.contains('on')), 'badge de statut : battement frais → « En ligne »');

  // Mobile : pas de scroll horizontal.
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  await mob.route(/\/heartbeat\.json$/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: HB() }));
  await mob.route(/abacus|raw\.githubusercontent|api\.github|top\.gg/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"value":1}' }));
  const mp = await mob.newPage();
  await mp.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'load' });
  await mp.waitForTimeout(600);
  ok(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobile : pas de scroll horizontal');
  await mob.close();

  ok(errors.length === 0, 'zéro erreur JS' + (errors[0] ? ' → ' + errors[0] : ''));
  await browser.close();
  console.log(fails ? '\n' + fails + ' échec(s)' : '\nSMOKE OK');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
