# Spécification — nouveaux jeux & améliorations pour Hasu Protect

> Proposition de conception pour trois nouveaux jeux — **Puissance 4**, **Course avec paris** et
> **Blackjack** — plus deux améliorations transversales : le **bouton Rejouer généralisé** et les
> **stats & badges par jeu**. Rédigée pour s'intégrer aux systèmes existants : XP/niveaux,
> `+gameleaderboard`, `+saison`, `+missions`, rôle 🎮 Joueur (`+joueur`) et, à terme, une monnaie de jeu.

---

## Principes communs aux trois jeux

- **Récompenses** : versées en **XP** au lancement (comme les jeux actuels). Le jour où une monnaie
  de jeu existe, la Course et le Blackjack basculent dessus (ce sont des jeux à mise — voir la note
  économie en bas de page) ; le Puissance 4 peut rester en XP.
- **Classements** : chaque victoire compte dans `+gameleaderboard` et `+saison`, comme les jeux existants.
- **Missions** : ajouter des contrats possibles dans le pool de `+missions`
  (ex. « Gagne une partie de Puissance 4 », « Termine une course dans le top 2 », « Fais un blackjack »).
- **Bouton Rejouer** : à la fin de chaque partie, un bouton 🔄 **Rejouer** relance une partie avec les
  mêmes participants (expire après 60 s). Voir la section « Bouton Rejouer généralisé » : ce mécanisme
  est à déployer sur **tous** les jeux existants, pas seulement les trois nouveaux.
- **Verrou par salon** : une seule partie d'un même jeu à la fois par salon (comme `+devine`).
- **Timeouts** : toute attente d'action a une échéance (voir chaque jeu) ; à expiration, forfait ou
  annulation propre avec remboursement des mises.
- **Bots exclus** : impossible de défier un bot ou de miser pour un bot.

---

## 1) `+puissance4` — Puissance 4 (Connect 4)

**Alias** : `+p4`, `+connect4` · **Accès** : 👥 Tous · **Catégorie** : Fun

Complément naturel du `+morpion` : mêmes interactions à boutons, parties plus longues et plus tactiques.

### Déroulé

1. `+puissance4 @membre` — l'adversaire reçoit un embed d'invitation avec boutons ✅ **Accepter** /
   ❌ **Refuser** (expire après 60 s).
2. La grille **7 colonnes × 6 lignes** est affichée dans un embed avec des emojis :
   ⚪ case vide · 🔴 joueur 1 · 🟡 joueur 2. Numéros de colonnes en en-tête (1️⃣…7️⃣).
3. Sous l'embed, **7 boutons** (rangée de 4 + rangée de 3) : `1`…`7`. Seul le joueur dont c'est le
   tour peut cliquer (les clics des autres sont ignorés avec un message éphémère).
4. Le jeton **tombe** dans la colonne choisie (gravité). Une colonne pleine voit son bouton désactivé.
5. **45 s par coup** ; à expiration, le joueur au trait perd par forfait.

### Fin de partie

- **Victoire** : 4 jetons alignés (horizontal, vertical ou diagonale). Les 4 jetons gagnants sont mis
  en évidence (ex. remplacés par 🔴➡️🟥 / 🟡➡️🟨).
- **Nul** : grille pleine (42 coups) sans alignement.
- **Récompenses** (alignées sur `+morpion`) : gagnant **+XP** (même barème que le morpion, éventuellement
  légèrement supérieur car la partie est plus longue), nul : petite consolation pour les deux.

### Détails d'implémentation

- État par partie : `grid[7][6]`, `turn`, `players[2]`, `messageId`, `channelId`, timestamp du dernier coup.
- Détection de victoire : après chaque coup, scanner uniquement autour de la dernière case jouée
  (4 directions), pas toute la grille.
- Mode facultatif V2 : `+puissance4` sans mention → **contre le bot** (IA minimax profondeur 4-5 avec
  élagage alpha-bêta ; largement suffisant et instantané sur une grille 7×6).

---

## 2) `+course` — Course avec paris 🏇

**Alias** : `+race`, `+horserace` · **Accès** : 👥 Tous · **Catégorie** : Fun

Jeu de salon très animé : tout le monde parie, tout le monde regarde la même animation en direct.
Synergie directe avec la future monnaie (puits via la commission).

### Déroulé

1. `+course [mise]` ouvre un **lobby de paris** (mise par défaut : 50 XP ; bornes min/max configurables).
   L'embed présente **5 coureurs** à cotes affichées, avec un thème visuel — au choix simple (🐎 🐢 🦅 🐍 🐗)
   ou **thème 40k** pour la cohérence avec l'univers du bot (⚔️ Space Marine, 🛠️ Mechanicus,
   💀 Nécron, 🦠 Tyranide, 🔥 Chaos).
2. **5 boutons**, un par coureur. Cliquer = miser sur ce coureur (un seul pari par membre, re-cliquer
   change de coureur tant que la fenêtre est ouverte). Fenêtre de paris : **45 s**, compte à rebours
   dans l'embed.
3. **Minimum 2 parieurs**, sinon la course est annulée et tout le monde est remboursé.
4. **La course** : le bot édite le message toutes les ~2 s (attention au rate limit : 1 édition / 2 s
   maximum). Piste de ~18 cases par ligne :
   `🏁▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️🐎`
   Chaque tick, chaque coureur avance de 0 à 3 cases, pondéré par sa cote.
5. **Événements aléatoires** (1 chance sur 3 par course, jamais plus d'un) : un coureur trébuche
   (recule de 2), un coureur a un coup de boost (avance de 4), photo-finish départagé au hasard —
   chaque événement est commenté d'une ligne dans l'embed (« 💥 Le Nécron se reboote en pleine ligne droite ! »).

### Cotes et gains

- Les cotes sont tirées au lancement dans un petit pool équilibré, par exemple :
  **×1.8, ×2.2, ×3, ×4, ×6** (le favori gagne souvent mais rapporte peu).
- La probabilité de victoire de chaque coureur est calibrée pour que **l'espérance de gain soit
  ~0,92–0,95** : la « maison » prélève de fait **5–8 %**, ce qui fait de la course un puits doux
  pour l'économie.
- Gain d'un parieur gagnant : `mise × cote` (arrondi). Les perdants perdent leur mise.
- Affichage final : podium 🥇🥈🥉, liste des gagnants et de leurs gains.

### Garde-fous

- Mise plafonnée (ex. 200 XP ou un plafond fonction du niveau) et **cooldown de 5 min par salon**.
- Un membre ne peut pas parier s'il n'a pas le solde de la mise (pas de solde négatif).
- Option de lancement automatique aux heures de pointe (données `+pulse`), annoncée au rôle 🎮 Joueur.

---

## 3) `+blackjack` — Blackjack contre le bot 🃏

**Alias** : `+bj`, `+21` · **Accès** : 👥 Tous · **Catégorie** : Fun

Jeu solo simple et addictif. C'est le **puits économique** assumé de la gamme : l'avantage de la
maison est faible mais réel, il régule la masse d'XP/monnaie injectée par les autres jeux.

### Déroulé

1. `+blackjack <mise>` (bornes : min 20, max 250 XP ou plafond fonction du niveau). La mise est
   débitée immédiatement.
2. Distribution : 2 cartes visibles pour le joueur, 1 visible + 1 cachée pour le croupier.
   Affichage embed avec emojis de cartes (`🂡`-style ou texte `A♠ 10♥`) et le total du joueur.
3. Boutons : 🃏 **Tirer** (hit) · ✋ **Rester** (stand) · ✖️2 **Doubler** (double — uniquement sur les
   2 premières cartes, si le solde le permet : double la mise, une seule carte, puis stand forcé).
   *(Le split est volontairement exclu de la V1 pour garder l'implémentation simple.)*
4. **30 s par décision**, sinon stand automatique.
5. Le croupier révèle sa carte cachée et **tire jusqu'à 17 inclus, reste à partir de 17**
   (règle « dealer stands on all 17s »).

### Règles de paiement

| Résultat | Paiement |
|---|---|
| **Blackjack naturel** (A + 10/figure sur 2 cartes) | mise × **2,5** (3:2) |
| Victoire simple | mise × 2 |
| Égalité (push) | mise remboursée |
| Défaite / dépassement (bust > 21) | mise perdue |
| Croupier a blackjack aussi | push |

- L'As vaut 11 ou 1 (main « soft » gérée automatiquement).
- Sabot de 4 jeux mélangés, re-mélangé à chaque partie (pas de comptage possible, pas d'état à persister).
- Avec ces règles, l'avantage maison est d'environ **1–2 %** : les joueurs gagnent souvent
  (sensation positive), mais le système draine doucement sur le volume.

### Garde-fous (importants pour un jeu de mise)

- **Plafond de pertes journalier** par membre (ex. 600 XP/jour) : atteint → message doux
  « Reviens demain, le casino est fermé pour toi 🌙 ».
- **Cooldown court** entre deux mains (ex. 10 s) pour éviter le spam-farm des stats.
- Jamais de solde négatif ; la mise est vérifiée avant distribution.
- **Toggle admin** : `+blackjack off|on` (et idem `+course`) pour permettre aux serveurs qui ne
  veulent pas de jeux de mise de les désactiver.
- Les statistiques (mains jouées, blackjacks, plus gros gain) alimentent le profil `+level`.

---

## 4) Bouton « Rejouer » généralisé 🔄 — sur tous les jeux

Friction en moins, parties en plus : à la fin de **chaque** partie, l'embed de résultat porte un
bouton 🔄 **Rejouer**. À déployer sur les jeux existants comme sur les trois nouveaux.

### Comportement par famille de jeu

| Famille | Jeux | Qui peut cliquer | Effet du clic |
|---|---|---|---|
| Solo | `+memory`, `+demineur`, `+rps`, `+expedition`, blackjack | le joueur de la partie | relance immédiatement une partie pour lui |
| Duel | `+morpion`, puissance 4, `+warhammer @joueur` | les 2 joueurs | revanche : le 1er clic « propose », le 2e clic lance (état affiché sur le bouton : `Rejouer (1/2)`) |
| Salon / multijoueur | `+devine`, `+quizz`, `+sondagefun`, `+loto`, `+bang`, `+tournoi`, course | n'importe qui | relance un lobby du même jeu dans le salon |

### Règles communes

- Le bouton **expire après 60 s** (désactivé visuellement) pour ne pas laisser traîner des boutons
  actifs dans l'historique du salon.
- Le bouton est **désactivé si une partie du même jeu est déjà en cours** dans le salon (respect du
  verrou par salon) — clic → message éphémère « Une partie est déjà en cours ».
- Les **cooldowns et plafonds restent appliqués** : Rejouer ne contourne ni le cooldown de la course,
  ni le plafond de pertes du blackjack, ni les limites anti-farm d'XP. Si le cooldown bloque, le
  clic répond en éphémère avec le temps restant.
- Pour les jeux à mise, Rejouer **reprend la même mise** (revérifiée contre le solde au moment du clic).
- Implémentation : un seul handler générique `replay:<jeu>:<messageId>` en `custom_id`, qui re-déclenche
  la commande d'origine avec les mêmes paramètres — pas de logique dupliquée par jeu.

---

## 5) Stats par jeu & badges de succès 🏅

`+level` agrège déjà niveau/XP, aura, grade, ligue, série et Warhammer — on y ajoute une dimension
« palmarès » : winrate, records et badges par jeu.

### Données à suivre (par membre × par serveur × par jeu)

- `parties`, `victoires` (→ winrate calculé),
- 1 à 2 **records** propres à chaque jeu, par exemple :

| Jeu | Record(s) suivi(s) |
|---|---|
| `+quizz` | meilleur score /10, victoires |
| `+devine` | trouvé en moins d'essais |
| `+memory` | paires en un minimum d'essais |
| `+demineur` | plus gros pot encaissé |
| `+tournoi` | tournois remportés |
| `+expedition` | région la plus profonde, boss finaux tués |
| `+warhammer` | victoires solo/PvP/boss |
| Puissance 4 | victoires, plus longue série |
| Course | gains cumulés, plus gros gain en une course |
| Blackjack | blackjacks naturels, plus gros gain en une main |

### Badges de succès

Attribués automatiquement au fil du jeu, avec une annonce discrète dans le salon au moment du déblocage
(« 🏅 @membre débloque **Cerveau** ! »). Pool de départ (3 paliers 🥉🥊🥇 quand c'est un compteur) :

- **Stratège** — 10 / 50 / 200 victoires en duel (morpion + puissance 4 confondus)
- **Cerveau** — 10 / 50 / 200 victoires au quizz
- **Increvable** — série `+daily` de 7 / 30 / 100 jours
- **Tueur de dieux** — tuer le boss final d'expédition 1 / 5 / 20 fois
- **Main d'or** — 5 / 25 / 100 blackjacks naturels
- **Parieur fou** — gagner une course à cote ×4 ou plus
- **Démineur** — encaisser un pot au dernier moment 10 fois
- **Polyvalent** — gagner au moins une fois à 8 jeux différents

### Affichage

- **`+level`** : une ligne « Palmarès » (nombre de badges + les 3 plus rares en emoji) sur la carte
  existante — pas de refonte de la carte.
- **`+level jeux`** (ou `+stats @membre`) : la vue détaillée — winrate par jeu, records, liste
  complète des badges avec date de déblocage.
- Les badges sont **permanents** (pas de reset saisonnier) ; les records sont tous-temps, la saison
  garde son propre classement via `+saison`.

### Implémentation

- Une table/collection unique `game_stats` (`guildId`, `userId`, `game`, `plays`, `wins`, `records{}`)
  mise à jour par un petit helper `recordGameResult(game, winnerIds, meta)` appelé à la fin de chaque
  partie — un seul point d'entrée, chaque jeu l'appelle avec ses métadonnées.
- Les badges sont **dérivés** des stats (recalculés au moment de l'écriture), pas stockés à part —
  seule la date de premier déblocage est persistée.
- Rétro-compatibilité : les victoires déjà comptées par `+gameleaderboard` peuvent servir d'amorce
  pour `parties`/`victoires` si elles sont détaillées par jeu ; sinon les stats démarrent à zéro.

---

## Note économie (transversale)

Ces trois jeux ont des rôles économiques complémentaires et volontairement différents :

| Jeu | Rôle économique | Flux |
|---|---|---|
| Puissance 4 | **Source** modérée (récompense d'habileté PvP) | +XP au gagnant |
| Course | **Redistribution** entre joueurs + petit puits (commission 5–8 %) | neutre-négatif |
| Blackjack | **Puits** principal (avantage maison 1–2 % sur le volume) | négatif |

Ils peuvent tous démarrer en XP dès maintenant. Si une monnaie de jeu (« Trônes ») est introduite
plus tard, la Course et le Blackjack migrent dessus tels quels — les pourcentages de commission et
d'avantage maison sont précisément ce qui rend la monnaie stable sans retoucher les autres jeux.

## Ordre de développement conseillé

1. **Stats par jeu (helper `recordGameResult`)** — à poser en premier : les trois nouveaux jeux
   l'appellent dès leur sortie, et les jeux existants s'y branchent un par un.
2. **Bouton Rejouer généralisé** — handler générique, puis activation jeu par jeu (gain immédiat
   sur les jeux existants, sans attendre les nouveaux).
3. **Blackjack** — le plus simple des trois jeux (solo, pas de synchronisation multi-joueurs),
   valide les garde-fous de mise qui resservent pour la course.
4. **Puissance 4** — réutilise le squelette du morpion (invitation, tours, boutons, forfait).
5. **Course** — le plus riche (lobby, animation par éditions, paiements multiples), mais réutilise le
   système de mise du blackjack.
6. **Badges** — une fois quelques semaines de stats accumulées, activer les badges (les seuils
   tombent juste si les compteurs existent déjà).
