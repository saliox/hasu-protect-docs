// Smoke test E2E (CI) : ouvre le site déployable dans un vrai Chromium et vérifie ce que les
// contrôles statiques (hash CSP, sentinelle, tests unitaires) ne peuvent pas voir — page qui
// charge sans erreur JS, modale qui s'ouvre, historique à la demande, pas de débordement mobile,
// boîte du changelog de taille saine (le bug du « contour doré » de 34 000 px serait bloqué ici).
// Les hôtes externes sont bouchés : le test est hermétique et rapide.
const { chromium } = require('playwright');
let fails = 0;
const ok = (c, l) => { console.log((c ? 'ok - ' : 'NOT OK - ') + l); if (!c) fails++; };

(async () => {
  // CHROME_PATH : exécution locale avec un Chromium déjà présent (le CI installe le sien).
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext({ locale: 'fr-FR', colorScheme: 'dark' });
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

  // Mobile : pas de scroll horizontal.
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
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
