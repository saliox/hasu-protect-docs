# Implémenter la spec sur ton PC 💻

La spécification des jeux (`game-ideas.md`) vit sur la branche
`claude/hasu-protect-game-ideas-jf1wv5` de ce dépôt. Le code du bot n'étant pas accessible depuis
les sessions web/téléphone, c'est **Claude Code sur ton PC** (là où se trouve le code du bot) qui
fait l'implémentation. Marche à suivre :

## 1. Prérequis (une seule fois)

- Claude Code installé sur le PC : `npm install -g @anthropic-ai/claude-code` (ou l'app de bureau),
  puis `claude` pour se connecter.

## 2. Récupérer la spec dans le dossier du bot

Ouvre un terminal **dans le dossier du bot** et copie la spec depuis GitHub :

```bash
curl -o game-ideas.md https://raw.githubusercontent.com/saliox/hasu-protect-docs/claude/hasu-protect-game-ideas-jf1wv5/game-ideas.md
```

*(Si le dépôt docs est privé, télécharge plutôt `game-ideas.md` depuis GitHub à la main et
dépose-le dans le dossier du bot.)*

## 3. Lancer l'implémentation

Toujours dans le dossier du bot :

```bash
claude
```

Puis colle ce prompt :

> Lis `game-ideas.md` à la racine. C'est la spécification de nouveaux jeux et d'améliorations pour
> ce bot Discord. Implémente les chantiers **dans l'ordre de développement conseillé** en bas du
> fichier, en commençant par le chantier 1 (helper `recordGameResult`) et le chantier 2 (bouton
> Rejouer généralisé). Réutilise le style, la structure et les helpers existants du code (regarde
> comment `+morpion`, `+memory` et `+demineur` sont faits avant d'écrire quoi que ce soit).
> Respecte tous les garde-fous de la spec (cooldowns, plafonds, anti-farm). Fais un commit par
> chantier terminé. Quand un chantier est fini, teste-le, puis passe au suivant. Si un point de la
> spec est ambigu par rapport au code existant, choisis l'option la plus proche des conventions du
> code et note ton choix dans le message de commit.

## 4. Reprendre plus tard

Chaque session suivante, dans le dossier du bot : `claude` puis
« Continue l'implémentation de `game-ideas.md` là où on s'est arrêté — regarde les commits pour
voir ce qui est déjà fait. »

## Alternative : tout faire depuis le téléphone

Si le dépôt du bot est sur GitHub, tu peux aussi l'ajouter à une session Claude Code web/mobile
(« ajoute saliox/nom-du-repo-du-bot ») : l'implémentation se fait alors dans le cloud, et ton PC
n'a plus qu'à `git pull`.
