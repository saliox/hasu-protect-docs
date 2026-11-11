# Documentation de Hasu Protect

[![Disponibilité du bot](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsaliox%2Fhasu-protect-docs%2Fuptime%2Fbadge.json)](https://saliox.github.io/hasu-protect-docs/)

Le site de documentation du bot Discord **Hasu Protect** — protection anti-raid, anti-nuke et
modération.

**👉 [Lire la documentation](https://saliox.github.io/hasu-protect-docs/?lang=fr)**

## Ce dépôt

C'est un site statique publié par GitHub Pages. Il n'y a pas de framework : le site tient dans une
seule page HTML, avec le CSS et le JavaScript directement dedans.

| Fichier | À quoi il sert |
|---|---|
| `index.html` | Le site complet (page générée par le bot, puis habillée) |
| `habillage/` | L'habillage du site : accueil, chiffres, Guardian, invitation, scène 3D |
| `404.html` | Page d'erreur |
| `translations.json` | Les textes en français et en anglais |
| `stats.json` | Les chiffres d'entraînement de Guardian AI affichés sur la page |
| `assets/` | Les captures d'écran |
| `sitemap.xml`, `robots.txt` | Référencement |
| `hasu-client/` | Manifestes de mise à jour du launcher Hasu Client (autre projet) |

Le site fixe une politique de sécurité de contenu (CSP) stricte. Seules exceptions, ajoutées par
l'habillage : `habillage/hp.js` (même origine), three.js depuis cdnjs et les polices Google Fonts.

## Modifier le site

`index.html` est **généré** — ne l'édite pas à la main, tes changements seraient écrasés à la
prochaine génération. Passe par le script de build et republie la page.

Pour changer un texte affiché, c'est dans `translations.json` (les deux langues côte à côte).

L'habillage s'applique par-dessus la page générée : `node habillage/habiller.js` habille `index.html`
en place, et ne fait rien si la page l'est déjà. Le workflow `habillage.yml` le relance tout seul
après chaque publication du bot, repasse les gardes (CSP, tests unitaires, sentinelle) et ne pousse
la page habillée que s'ils sont verts. Pour modifier l'habillage, édite les fichiers de `habillage/`.

## À faire

- Le générateur (`build.js`) n'est pas encore dans le dépôt : sans lui, `index.html` ne peut pas être
  reconstruit à partir de sa source.
- `hasu-client/version-beta.json` est identique à `version.json` : le canal bêta ne sert donc à rien
  pour l'instant.
