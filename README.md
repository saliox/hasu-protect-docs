# Documentation de Hasu Protect

Le site de documentation du bot Discord **Hasu Protect** — protection anti-raid, anti-nuke et
modération.

**👉 [Lire la documentation](https://saliox.github.io/hasu-protect-docs/?lang=fr)**

## Ce dépôt

C'est un site statique publié par GitHub Pages. Il n'y a pas de framework : le site tient dans une
seule page HTML, avec le CSS et le JavaScript directement dedans.

| Fichier | À quoi il sert |
|---|---|
| `index.html` | Le site complet (page générée) |
| `404.html` | Page d'erreur |
| `translations.json` | Les textes en français et en anglais |
| `stats.json` | Les chiffres d'entraînement de Guardian AI affichés sur la page |
| `assets/` | Les captures d'écran |
| `sitemap.xml`, `robots.txt` | Référencement |
| `hasu-client/` | Manifestes de mise à jour du launcher Hasu Client (autre projet) |

Le site fixe une politique de sécurité de contenu (CSP) stricte : pas de script externe, pas de
ressource distante autre que l'API GitHub.

## Modifier le site

`index.html` est **généré** — ne l'édite pas à la main, tes changements seraient écrasés à la
prochaine génération. Passe par le script de build et republie la page.

Pour changer un texte affiché, c'est dans `translations.json` (les deux langues côte à côte).

## À faire

- Le générateur (`build.js`) n'est pas encore dans le dépôt : sans lui, `index.html` ne peut pas être
  reconstruit à partir de sa source.
- `hasu-client/version-beta.json` est identique à `version.json` : le canal bêta ne sert donc à rien
  pour l'instant.
