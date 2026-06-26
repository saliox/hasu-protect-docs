# Documentation — [+] Hasu Protect

Site de documentation **autonome** (un seul fichier HTML) listant **toutes les commandes** du bot.

## Ouvrir
Double-clique sur **`docs/index.html`** (s'ouvre dans le navigateur). Aucune dépendance, aucun serveur.

Fonctionnalités : recherche en direct (nom/description), navigation par catégorie, 108 commandes, galerie d'aperçu.

## Mettre à jour la liste des commandes
Après avoir ajouté/modifié des commandes :
```
node docs/build.js
```
Il relit automatiquement `commands/` + les catégories de `commands/help.js` et régénère `index.html`. (Les commandes secrètes sans description ne sont pas documentées.)

## Ajouter les captures d'écran
Dépose tes captures dans **`docs/assets/`** avec EXACTEMENT ces noms (la galerie les affiche, sinon un placeholder apparaît) :

| Fichier | Capture attendue |
|---|---|
| `capture-menu.png` | Le menu `+help` (page d'accueil avec les catégories) |
| `capture-config-1.png` | Menu config — préfixe, auto-rôle, bienvenue, niveaux |
| `capture-config-2.png` | Menu config — changelog, modules, mots interdits, custom |
| `capture-config-3.png` | Menu config — starboard, suggestions, stats, apparence, vérif |
| `capture-securite.png` | Menu sécurité — rôle d'alerte, scan, membres à risque, backup, logs |

## Hébergé en ligne
**Site en ligne : https://saliox.github.io/hasu-protect-docs/**

Ce dossier `docs/` EST le dépôt GitHub `saliox/hasu-protect-docs`. GitHub Pages sert la branche **`main`**, dossier **`/ (root)`** — surtout PAS `/docs` (le site est déjà à la racine de ce dépôt, sinon le build échoue). À chaque changelog, le bot régénère `index.html` puis `git push` → le site se met à jour tout seul.
