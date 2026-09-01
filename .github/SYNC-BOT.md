# ⚠️ À porter dans la copie locale du site (générateur du bot)

> **Récidive du 07/08** : la « maj site » du bot a de nouveau écrasé tous les
> correctifs ci-dessous (re-greffés depuis). Tant que le template local ne les
> intègre pas, chaque déploiement du bot les supprime.

> 🛡️ **Sentinelle** : depuis, chaque push sur `main` est vérifié par
> `.github/workflows/sentinel.yml` (`sentinel.js`) — si un déploiement écrase
> un des blocs ci-dessous, le commit reçoit une croix rouge et GitHub envoie
> un mail, avec la liste exacte des sections à re-greffer.

Le déploiement auto du bot (« état local = référence ») a déjà écrasé une fois
les correctifs fusionnés sur `main` (commit `04e80b70`, réconciliation du 23/07).
Tant que la copie locale du site sur le PC du bot n'intègre pas les correctifs
ci-dessous, chaque « maj site » du bot les fera disparaître à nouveau.

## Correctifs à reporter dans le template local d'index.html

1. **CSP** : `connect-src` doit inclure `https://raw.githubusercontent.com` ;
   le hash `script-src` doit être recalculé à chaque modification du script
   inline (le workflow `check-csp.yml` le vérifie à chaque push).
2. **Badge de statut** : démarre gris « Vérification… » (`bstat unk`), quatre
   issues — < 4 min 30 : en ligne · lecture EN ÉCHEC : « Vérification… », on ne
   conclut pas · ≥ 10 min APRÈS une lecture réussie : hors ligne, panne prouvée ·
   entre les deux : état conservé. Le heartbeat est lu sur la seule source
   vivante (`__rawURL`, l'hôte de production) ; `__hbSeen` retient la dernière
   lecture RÉUSSIE et sépare « on ne sait pas » de « le bot est tombé ».
   Plus aucune source de secours : le repli sur la branche `status` de ce dépôt
   a été retiré le 01/09/2026 — il servait un battement figé au 26/08 qui, sur un
   chargement à froid, écrasait les compteurs (19 serveurs / 4354 membres au lieu
   de 20 / 4328) et faisait reculer le panneau Guardian.
3. **Parseur de paramètres** (`parseParams` + `splitTop`) : les groupes
   `[a | b | c]` / `<a|b>` sont des choix de valeurs, pas des formes
   alternatives — sinon 22 commandes (ex. `+shield [smart | off | reset]`)
   affichent un paramètre « [smart » cassé.
4. **Panneau Guardian** (`renderG`) : sections Entraînement / Jeu adverse /
   Validation hors-ligne, précision recalculée avec décimales
   (`(samples-fp-fn)/samples`), compteurs avec dénominateur (« 11 / 40 000 »),
   généralisation + gain affichés, PAS de section « Derniers cas appris »
   (retirée à la demande), séparateurs de milliers.
5. **Fichiers à ne plus déployer** : `translations.json` (jamais chargé par le
   site), les captures inutilisées (`assets/capture-config-*.png`,
   `capture-menu.png`, capture racine). Seule `capture-securite.png` sert
   (image JSON-LD).

La référence exacte de chaque bloc est dans l'index.html de `main` après la
fusion de la PR #6 — le plus simple est de recopier ces blocs tels quels dans
le template local.

6. **Compteur de visites global** : en plus du compteur local par navigateur,
   le badge affiche le total anonyme de tous les visiteurs via Abacus
   (`abacus.jasoncameron.dev` — /hit une fois par session, /get ensuite,
   valeur mémorisée en localStorage `gvisits`). La CSP `connect-src` doit
   inclure `https://abacus.jasoncameron.dev` ET
   `https://raw.githubusercontent.com` (heartbeat du badge de statut).

7. **Recatégorisation de 4 commandes** (appliquée côté site en JS au chargement —
   le bloc reste NÉCESSAIRE tant qu'index.html n'est pas régénéré — ses data-cat sont figés) :
   | Commande | Ancienne catégorie | Nouvelle catégorie | Raison |
   |---|---|---|---|
   | `say`, `embed`, `dm` | Modération | Communauté & Utilitaires | messagerie/annonces, comme `announce`/`sticky` |
   | `close` | Modération | Communauté & Utilitaires | clôture de ticket — `ticket` y est déjà |
   | ~~`massrole`, `delrole`~~ | — | **non déplacées** | retirées de MOVES : les deux sont dans `CATEGORIES_FERMEES` (bot, systems/permissions.js:260), et `delrole` partage la branche owner de `nuke`/`addrole` (bot, index.js:1839, même liste `nuke_allowed`) — la raison « gestion de rôles du quotidien » était fausse, le manifeste du site l'atteste déjà (`"delrole": "owner"`) |

8. **Perf & robustesse (PR #13)** : `content-visibility:auto` sur `.cmd` et
   `.hentry` (rendu différé hors écran), debounce des deux recherches,
   timers muets quand l'onglet est caché, `preconnect` raw + abacus dans le
   `<head>`, `updating` honoré seulement si heartbeat < 10 min, compteur
   `/get` seul si le stockage est bloqué (navigation privée), seuil de
   fraîcheur unifié 270 s, CSS `.gex` mort supprimé. Tests unitaires du
   parseur dans `.github/unit-tests.js`, exécutés par le workflow CI.

9. **Disponibilité 7 jours (PR #15)** : clic sur le badge de statut → panneau
   avec 168 cases horaires (vert ≥ 27 battements/h, orange partiel, rouge 0)
   et pourcentage global. Données : `uptime.json` publié toutes les heures sur
   la branche `uptime` par `.github/workflows/uptime.yml` (reconstruit depuis
   les commits heartbeat de la branche `status` — RIEN à changer côté bot).
   À porter dans le template : le bloc CSS `.uppop`/`.upgrid`, les clés I18N
   `up*`, et le bloc JS `renderUp`/`toggleUp`.

10. **Historique à la demande (PR #16)** : le site contient un chargeur
    `loadHist()` — si `#hist` ne contient aucune `.hentry`, le clic sur
    `#moreBtn` va chercher `history.html` à la racine et injecte les entrées
    (langue appliquée, échec géré). Consigne de scission côté générateur :
    voir `CONSIGNES-BOT.md` à la racine + le commentaire en tête d'index.html.
    Tant que l'historique reste inline, le chargeur est strictement no-op.

11. **Lot UX (PR #17)** : filtres flottants mobile (bouton 🗂️ bas-gauche après
    un écran de scroll → feuille avec catégories + accès, compteurs inclus),
    vote « utile » par commande dans la modale : pilules 👍/👎 avec scores
    NETS, vote retirable (re-clic) et changeable (clic sur l'autre) —
    Abacus n'incrémentant que vers le haut, les retraits vivent sur des
    compteurs de rétractation (`cmd-<nom>-ry` / `-rn`) et le net =
    posés − retirés (clés posées : `cmd-<nom>` / `cmd-<nom>-no`), thème qui suit le système tant
    qu'aucun choix manuel n'est mémorisé, badge « NOUVEAU » sur les commandes
    apparues depuis la dernière visite du visiteur (localStorage `seenCmds`),
    bouton 📤 Partager (Web Share API) dans la modale. Blocs : CSS `.newb`/
    `.fabf`/`.fsheet`/`.m-vote`, clés I18N correspondantes, wrapper openSim,
    et curTheme() basé sur prefers-color-scheme.

12. **Lot découverte (PR #18)** : ⭐ favoris (étoile sur chaque carte,
    localStorage `favCmds`, barre de puces au-dessus des filtres), palette
    Ctrl+K (recherche instantanée, flèches + Entrée, tolérance aux fautes
    via distance d'édition — aussi branchée sur la recherche principale en
    repli « résultats approchés »), PWA (manifest.webmanifest + sw.js + icônes assets/icon-*.png
    — fichiers séparés que le bot ne touche pas ; index.html doit garder le
    <link rel="manifest">, l'apple-touch-icon, l'enregistrement du SW et
    `worker-src 'self'` dans la CSP).

13. **Lot polish (PR #19)** : botReply enrichi (~30 familles — 145 commandes
    tombaient sur le générique « Action effectuée », désormais 0), chips des
    filtres actifs au-dessus des résultats (`#achips`, retirables + « Tout
    effacer »), URL partageable (?q=&cat=&acc= synchronisée par filt() et
    appliquée au chargement), bouton « 🎮 Ouvrir Discord » dans la modale
    (copie + discord://), accessibilité (role=dialog + aria-modal + piège du
    focus dans la modale, Échap ferme feuille de filtres et panneau uptime),
    mini-tour de bienvenue 3 étapes (première visite seulement, jamais sur
    lien profond, localStorage `tourDone`).

14. **Lot analytics (PR #21)** : meta og:image/twitter (bannière
    `assets/og-banner.png`, 1200×630 — les partages Discord ont un visuel),
    panneau « 📈 Réseau » dans la barre latérale (courbes 30 j
    serveurs/membres depuis `growth.json` — point horaire ajouté par
    uptime.yml quand le heartbeat est frais — + avis 👍/👎 agrégés depuis
    `votes.json`, relevé quotidien par votes.yml ; panneau masqué sans
    données), bandeau « ✨ N nouveautés depuis ta dernière visite → voir le
    changelog » pour les visiteurs de retour (rejet mémorisé par signature).
    Les deux workflows publient sur la branche `uptime` en préservant
    mutuellement leurs fichiers.

15. **Nouveautés v2 + audit (PR #23)** : bandeau des nouveautés avec les
    commandes elles-mêmes en puces cliquables (max 5 + « +N »), garde
    anti-bruit (retour après > 60 j → pas de badges, localStorage `seenAt`),
    badge NOUVEAU aussi dans les résultats de la palette Ctrl+K. Audit
    sécurité : hlText/escH vérifiés sains (pas de XSS via ?q=, hash ou
    recherche — testé avec payloads réels) ; widget top.gg ressuscité
    (il était triplement mort : image bloquée par img-src 'self', onload
    inline bloqué par la CSP à hash, et loading="lazy" dans un conteneur
    display:none qui ne charge jamais → img-src += https://top.gg,
    révélation via listener JS, lazy retiré) ; labels des chips de filtres
    échappés (durcissement).

16. **Lot « prêt pour top.gg » (PR #28)** : encart « 🚀 Premiers pas » v2
    (5 étapes numérotées, puces `+commande` cliquables → fiche, clés I18N
    `qs1`–`qs5`/`qsInvite`, CSS `.qn`/`.qsc`), section **FAQ** statique en bas
    de `<main>` (6 `<details class="fq">` bilingues via `data-lang` + second
    bloc JSON-LD `FAQPage` dans le `<head>` — inerte, pas de hash CSP),
    **rappel de vote top.gg** (clic sur « Voter » →
    localStorage `votedTgAt` ; au retour 12 h+ → bouton pulsé `.revote-on`
    + libellé `revote`).

17. **Audit perf + EN (PR #30)** : **historique scindé** — les `.hentry` vivent
    dans `history.html` à la racine (chargées au clic par `loadHist()`, déjà
    en place) ; `#hist` ne garde que `#histSearch` + `#histNone` ; le
    générateur doit produire `history.html` et NE PLUS inliner les entrées
    (consigne détaillée dans `CONSIGNES-BOT.md` §1 — page 652 → 411 Ko).
    **Délégation d'événements** : plus AUCUN écouteur individuel sur les
    cartes (clic/clavier/copier/étoile) — 2 écouteurs délégués sur `<main>`.
    **applyLang économe** : n'écrit dans le DOM que si la valeur change
    (`data-fr0` mémorisé au premier passage EN seulement). **CSP** :
    `frame-ancestors` retiré (ignoré en `<meta>`, ne faisait que du bruit
    console). **Mini-tour** : fermé par
    l'ouverture de toute modale (`window.__tourEnd` + garde `done` contre le
    `setTimeout(show,1600)`) — il ne s'affiche plus par-dessus une fiche. **Widget top.gg**
    lisible et accordé au thème : `.topgg-badge img{width:min(340px,88%);
    height:auto}` + cadre arrondi/ombre/hover, et le SVG est demandé avec les
    paramètres de couleurs officiels (`topcolor`, `middlecolor`,
    `usernamecolor`, `certifiedcolor`, `datacolor`, `labelcolor`,
    `highlightcolor`) — palette sombre/claire re-peinte à chaque bascule via
    l'enveloppe d'`applyTheme` (bloc « Widget top.gg » du script).
    **EN complet** : clé `showhist` (bouton historique), aria-labels traduits
    (`ariaSim` sur les 189 cartes, `ariaTop`, `ariaTheme`, `ariaModal`,
    `ariaHist`) appliqués par `applyLang`. Tests : `.github/unit-tests.js`
    passe à 48 cas (md, escH, lev, sparkline).

18. **Guide « 🧭 J'ai besoin de… » RETIRÉ (12/08, PR #33)** : le bloc bêta
    (CSS `.needs`/`.nchip`/`.nsteps`, JS `var NEEDS=` + injection, clés I18N
    `needsT`/`needsSub`) a été supprimé à la demande — ne PAS le réintroduire
    depuis un vieux template.

19. **Démo de raid RETIRÉE (12/08, PR #35)** : le bouton héro « 🎬 Voir le
    bot en action », la fonction `runDemo`, le lien profond `#demo`, les clés
    I18N `demo*` et tout le CSS associé (`.cta-demo`, `.m-dchat`, `.m-sys`,
    `.m-join`, `.m-typing`, `.m-efields`, `.mdel`…) ont été supprimés à la
    demande — ne PAS les réintroduire depuis un vieux template.

20. **Lot données vraies + hygiène (PR #36)** : nombres des badges héros ET
    date du pied de page formatés selon la langue (`fmtN`/`setDT`, re-rendus
    à la bascule — les badges étaient déjà branchés sur le heartbeat via
    `setBadges`, désormais mémorisé dans `__hbData`) ; **préchargement de
    l'historique à l'inactivité** (`requestIdleCallback`, respect de
    `saveData`, variable `__histPre` consommée par `loadHist`) ; images de
    partage converties en **JPEG** (`assets/og-banner.jpg` 275→45 Ko,
    `assets/capture-securite.jpg` 112→68 Ko — les métas og:image/twitter et
    le JSON-LD pointent vers les .jpg, ne plus déployer les .png) ;
    `sitemap.xml` + `robots.txt` + `404.html` à la racine (à ne pas
    supprimer) ; badge de disponibilité 7 j dans le README (`badge.json`
    publié sur la branche uptime par build-uptime.js).


21. **Lot blindage (PR #37)** : panneau raccourcis **discret** (aucune UI
    permanente — touche « ? » hors champ de saisie et hors modale → panneau
    `.kbov`/`.kbbox`, Échap/clic ferme ; bloc JS « PANNEAU RACCOURCIS » +
    CSS `.kb*`). Côté dépôt uniquement (rien à porter dans le template,
    mais ne pas les effacer) : smoke test E2E Chromium sur chaque push/PR
    (`.github/smoke-test.js` + `workflows/smoke.yml` — erreurs JS, modale,
    historique, mobile, boîte changelog saine), **sauvegarde quotidienne du
    compteur de visites** dans `votes.json` (`site-visits`, via
    build-votes.js), rapport hebdo en issue chaque lundi
    (`build-report.js` + `weekly.yml`, label `rapport-hebdo`), contrôle
    hebdo des liens externes (`linkcheck.yml`, label `lien-mort`).
