# ⚠️ À porter dans la copie locale du site (générateur du bot)

> **Récidive du 07/08** : la « maj site » du bot a de nouveau écrasé tous les
> correctifs ci-dessous (re-greffés depuis). Tant que le template local ne les
> intègre pas, chaque déploiement du bot les supprime.

Le déploiement auto du bot (« état local = référence ») a déjà écrasé une fois
les correctifs fusionnés sur `main` (commit `04e80b70`, réconciliation du 23/07).
Tant que la copie locale du site sur le PC du bot n'intègre pas les correctifs
ci-dessous, chaque « maj site » du bot les fera disparaître à nouveau.

## Correctifs à reporter dans le template local d'index.html

1. **CSP** : `connect-src` doit inclure `https://raw.githubusercontent.com` ;
   le hash `script-src` doit être recalculé à chaque modification du script
   inline (le workflow `check-csp.yml` le vérifie à chaque push).
2. **Badge de statut** : démarre gris « Vérification… » (`bstat unk`), logique
   à trois zones (< 4 min 30 en ligne · ≥ 10 min hors ligne · entre les deux :
   état conservé + confirmation via API `contents`, throttlée). Heartbeat lu
   en priorité sur raw.githubusercontent (pas de quota), API en lecture exacte
   ponctuelle seulement.
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

7. **Recatégorisation de 6 commandes** (appliquée côté site en JS au chargement —
   le bloc devient no-op dès que le bot range ces commandes dans ses définitions) :
   | Commande | Ancienne catégorie | Nouvelle catégorie | Raison |
   |---|---|---|---|
   | `say`, `embed`, `dm` | Modération | Communauté & Utilitaires | messagerie/annonces, comme `announce`/`sticky` |
   | `close` | Modération | Communauté & Utilitaires | clôture de ticket — `ticket` y est déjà |
   | `massrole`, `delrole` | Sécurité & Antiraid | Modération | gestion de rôles du quotidien (contrairement à `addrole`, verrouillée façon nuke) |
