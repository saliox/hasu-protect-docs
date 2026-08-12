# 🤖 Consignes pour le générateur du site — à appliquer au prochain déploiement

## 1. Scinder l'historique du changelog (priorité — divise le poids de la page par ~2)

L'historique (53 entrées, 43 % du poids d'index.html, 68 % des nœuds DOM) est
téléchargé par tous les visiteurs alors que presque personne ne l'ouvre.
**FAIT côté dépôt le 12/08** : `history.html` existe à la racine et `#hist` est vide
dans l'index.html de `main`. Le générateur doit reproduire cet état (sinon sa
prochaine « maj site » ré-inline tout et annule le gain) :

1. Générer un fichier **`history.html`** à la racine, contenant **uniquement**
   les blocs `<div class="hentry">…</div>` — exactement le HTML qui se trouve
   aujourd'hui à l'intérieur de `#hist` — sans `<html>`, `<head>` ni `<body>`.
2. Dans `index.html`, laisser `#hist` **sans aucune `.hentry`** (garder la barre
   de recherche `#histSearch` et le message `#histNone`), et garder le bouton
   `#moreBtn` tel quel.
3. Rien d'autre : au premier clic sur « Voir tout l'historique », le site
   détecte l'absence d'entrées et charge `history.html` tout seul (avec état
   de chargement, gestion d'échec et application de la langue courante).

Gains attendus : transfert 145 → ~65 Ko gzippé, page interactive ~2× plus vite
sur mobile.

## 2. Conserver les blocs déjà en place lors des régénérations

La liste complète des correctifs et fonctionnalités à préserver dans le
template local est maintenue dans **`.github/SYNC-BOT.md`** (CSP, badge de
statut trois zones, parseur de signatures, panneau Guardian, compteur de
visites, changelog replié sur mobile, compteurs de catégories,
recatégorisation de 6 commandes, optimisations de rendu, panneau de
disponibilité 7 jours). Chaque « maj site » qui repart du template local sans
ces blocs les efface — c'est arrivé les 23/07 et 07/08.

## 3. Fichiers à ne plus déployer

`translations.json` (jamais chargé par le site) et les captures inutilisées
(seule `assets/capture-securite.png` sert, pour le JSON-LD).
