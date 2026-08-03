# ⚠️ À porter dans la copie locale du site (générateur du bot)

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
