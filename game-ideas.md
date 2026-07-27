# Spécification — nouveaux jeux & améliorations pour Hasu Protect

> Proposition de conception pour de nouveaux jeux et améliorations, validés au fil de la discussion :
> **Puissance 4**, **Course avec paris**, **Blackjack**, **bouton Rejouer généralisé**,
> **stats & badges par jeu**, **défi quotidien seedé**, **drops surprise**, **jeu inter-serveurs**,
> **Maître de guerre** (roi de la colline) et **l'Imposteur** (bluff social). Rédigée pour s'intégrer
> aux systèmes existants : XP/niveaux, `+gameleaderboard`, `+saison`, `+missions`, rôle 🎮 Joueur
> (`+joueur`) et, à terme, une monnaie de jeu.

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

## 6) `+defi` — Défi quotidien « seedé » 🎯

**Alias** : `+dailygame`, `+dg` · **Accès** : 👥 Tous · **Catégorie** : Fun

Le concept qui a fait le succès de Wordle : **tout le monde joue exactement la même partie**, une
seule fois, et on compare. Coût de dev très faible — le démineur et le memory existent déjà, il n'y a
qu'à fixer la graine aléatoire et ajouter un classement journalier.

### Déroulé

- Chaque jour à **00h00 (Europe/Paris)**, le bot génère la partie du jour : **une grille de démineur**
  et **un plateau de memory**, identiques pour tous les membres du serveur.
- `+defi` affiche l'état du jour : les deux épreuves, si tu les as déjà jouées, ton score, le top 5
  provisoire, et deux boutons **💣 Jouer le démineur** / **🧠 Jouer le memory**.
- **Un seul essai par membre et par épreuve** (pas de seconde chance — c'est ce qui donne de la
  valeur au score).
- **À minuit**, le bot poste automatiquement le récapitulatif dans le salon : podium 🥇🥈🥉 de chaque
  épreuve, récompense en XP au podium, et la nouvelle partie du jour est disponible.

### Anti-spoiler (le point critique)

Puisque tout le monde joue la même grille, il faut empêcher qu'un joueur révèle les positions aux autres :

- **La partie se joue en messages éphémères** (réponses d'interaction visibles par le seul joueur),
  pas dans le salon public — personne ne peut regarder ta grille par-dessus ton épaule.
- À la fin, le bot poste dans le salon un **résultat partageable façon Wordle**, qui montre la
  performance sans rien divulguer : `🎯 Défi du 3 juil. — 💣 💎×7 encaissé · 🧠 8 paires en 11 essais`.
- Le **classement détaillé du jour** (scores exacts) n'est visible qu'après avoir joué soi-même
  (avant : seul le nombre de participants est affiché).
- Le partage volontaire des positions entre amis reste possible — c'est acceptable : le **départage
  au temps** (voir barème) rend la copie peu rentable, et la graine étant **par serveur**, une
  solution ne circule jamais d'un serveur à l'autre.

### Barème

| Épreuve | Score | Départage |
|---|---|---|
| Démineur du jour | pot d'XP encaissé (💣 touchée = 0) | nombre de cases révélées, puis temps total |
| Memory du jour | 8 paires en un minimum d'essais | temps total |

- Récompense du podium à minuit : XP dégressif 🥇 > 🥈 > 🥉, plus une petite récompense de
  participation pour tous ceux qui ont joué les deux épreuves.
- **Série de participation** : jouer le défi chaque jour entretient une série (affichée dans `+defi`),
  avec un bonus aux paliers — même mécanique que `+daily`, à laquelle elle peut être adossée.
- Contrat possible dans `+missions` : « Participe au défi du jour ».

### Implémentation

- **Graine** : `seed = HMAC(secretBot, "YYYY-MM-DD" + guildId)`, injectée dans un PRNG déterministe
  (mulberry32 / xorshift128 — surtout pas `Math.random()`). Même code de génération que les jeux
  existants, seule la source d'aléatoire change. La graine par serveur (plutôt que globale) confine
  tout spoiler au serveur ; une graine globale ne deviendra intéressante que si un classement
  inter-serveurs voit le jour.
- **Stockage** : une entrée par tentative `{guildId, userId, date, épreuve, score, tiebreak, durée}` —
  l'unicité `(guildId, userId, date, épreuve)` garantit le « un seul essai » même en cas de double clic.
- **Récap de minuit** : le même planificateur que les annonces existantes (`+announce`, anniversaires) ;
  le salon du récap est celui où `+defi` a été configuré (`+defi setup #salon`, admin).
- Les scores alimentent `recordGameResult()` (section 5) : records « meilleur démineur du jour » et
  badge dédié possible (« Régulier » — 7/30/100 défis joués).

---

## 7) Drops surprise dans le chat 📦

**Commande admin** : `+drops` (setup/on/off) · **Catégorie** : Fun (événement passif)

Un des meilleurs moteurs d'activité qui existe sur Discord : quand le salon est vivant, le bot fait
tomber aléatoirement une caisse — premier à la récupérer gagne la récompense. Habillage 40k :
**« ⚠️ Une caisse de ravitaillement de l'Imperium s'est écrasée ! »**

### Déclenchement

- Le drop est déclenché par **l'activité réelle du salon** : un compteur de messages (auteurs
  distincts, anti-spam : max 1 point par membre par minute) alimente une probabilité de drop.
  Aucun drop dans un salon mort — c'est une **récompense d'activité**, pas un robinet.
- **Branché sur `+pulse`** : la probabilité est pondérée par la heatmap d'activité du serveur, avec
  un léger bonus aux heures de pointe (le drop doit être vu par du monde pour créer l'événement).
- Garde-fous : **3 à 6 drops par jour** par serveur (configurable), jamais deux dans la même heure,
  et uniquement dans les salons autorisés (`+drops setup #salon1 #salon2`).

### Récupération : deux formats qui alternent

1. **Caisse simple** (2/3 des drops) : un bouton 📦 **Récupérer** — le premier clic gagne. Rapide,
   brutal, efficace.
2. **Caisse verrouillée** (1/3 des drops) : pour éviter le camp du bouton, une **mini-énigme de
   ~10 secondes** protège la caisse. Le premier qui répond juste gagne. Pool d'énigmes :
   - petit calcul (« 17 + 26 ? »),
   - mot à recopier **avec les lettres mélangées** (« Déchiffre : `RAVTILEMLENIAT` »),
   - suite à compléter (« 2, 4, 8, 16, … ? »),
   - question de lore 40k facile (cohérence avec `+warhammer`).
   La réponse se donne **dans un modal** (formulaire ouvert par le bouton), pas dans le chat —
   sinon le premier à répondre en clair donne la solution à tous.

### Récompenses

- **Butin standard** : XP (fourchette configurable, ex. 30–80).
- **Butin rare** (~10 %) : caisse dorée ✨ — gros paquet d'XP, un ticket de `+loto`, ou une relique
  d'expédition temporaire. L'annonce du contenu rare au moment du drop (« caisse dorée !! ») fait
  courir tout le monde.
- **Malus rare** (~5 %, optionnel et désactivable) : la caisse est **piégée** (« C'était une ruse de
  l'Adeptus Mechanicus ») — petit malus d'aura 🟣 pour le pilleur, gros moment de rire pour le salon.
  Jamais de perte d'XP : on ne punit pas l'activité.
- La caisse **expire après 60 s** si personne ne la prend (message d'expiration, la caisse « rouille »).

### Garde-fous anti-farm

- **Cooldown personnel** : un même membre ne peut pas ramasser plus de 2 caisses par jour — au 3e
  clic, la caisse passe au suivant (« Tes bras sont pleins, citoyen »). Ça évite que le plus rapide
  du serveur rafle tout.
- Les comptes de **moins de 7 jours sur le serveur** ne peuvent pas ramasser (anti-multi-comptes,
  cohérent avec les critères déjà utilisés par `+giveaway`).
- Les drops sont **suspendus pendant un raid détecté** (le bot sait déjà le détecter) : pas de
  récompense qui tombe pendant un incident de sécurité.
- Stats alimentées dans `recordGameResult()` : caisses ramassées, caisses dorées — badge possible
  (« Pillard » 10/50/200 caisses).

---

## 8) Jeu inter-serveurs 🛰️ — exploiter le réseau anti-menaces

Le bot possède déjà une infrastructure que **aucun bot de jeux n'a** : le réseau inter-serveurs
construit pour l'anti-menaces (corroboration des indices de dangerosité entre serveurs). La
réutiliser pour du jeu est l'idée la plus différenciante de toute la spec — impossible à copier
sans reconstruire le réseau.

> ⚠️ **Principe d'isolation** : le canal de jeu doit être **logiquement séparé** du canal sécurité —
> mêmes tuyaux, messages distincts, et priorité absolue à la sécurité (le trafic jeu est coupé si le
> réseau est chargé par un incident). Aucune donnée de jeu ne doit influencer l'indice de dangerosité,
> et inversement.

### 8a. `+war` inter-serveurs — la Croisade 🗺️

- Aujourd'hui `+war` oppose des factions **dans** un serveur. En mode Croisade, **chaque serveur
  devient une faction** sur une carte galactique partagée de secteurs 40k.
- Les points de poussée (`+war push`, victoires Warhammer, expéditions réussies) alimentent la
  conquête de son serveur. Résolution **hebdomadaire** : le dimanche soir, chaque secteur bascule
  vers le serveur qui a le plus poussé.
- Récompense : le serveur qui domine la carte gagne un **boost d'XP collectif** la semaine suivante
  (+10 % pour tous ses membres) et un titre affiché dans `+base` / `+level`.
- Équilibrage clé : les points de poussée sont **normalisés par le nombre de membres actifs** du
  serveur (sinon les gros serveurs écrasent tout et les petits abandonnent). Un serveur de 50 actifs
  doit pouvoir battre un serveur de 500 mous.
- Opt-in explicite : `+war croisade on` (owner). Un serveur non inscrit joue le `+war` local classique.

### 8b. Quizz inter-serveurs du samedi soir 🎙️

- **Rendez-vous fixe** : samedi 21h, tous les serveurs inscrits jouent le **même quizz en simultané**
  (10 questions, mêmes questions partout — la graine partagée de la section 6 sert ici).
- Classement individuel inter-serveurs ET classement par serveur (moyenne des N meilleurs scores,
  N fixe — encore une fois pour ne pas avantager la taille).
- Annonce au rôle 🎮 Joueur 30 min avant. C'est le « prime time » du bot : un événement que les
  membres attendent, comme une émission.
- Anti-triche minimal : questions envoyées à tous au même instant, fenêtre de réponse courte (15 s),
  réponses par boutons éphémères.

### 8c. Duel de mascottes `+pet` 🐾

- Le `+pet` d'un serveur défie celui d'un autre serveur inscrit : `+pet duel` cherche un adversaire
  de « forme » comparable (matchmaking sur le niveau de santé/activité de la mascotte).
- Le duel dure **48 h** : chaque communauté « entraîne » sa mascotte en étant active (les mêmes
  signaux qui la nourrissent déjà). Barre de progression visible des deux côtés, éditée quelques
  fois par heure.
- Le serveur gagnant : bonus de nourriture pour la mascotte + petite pluie d'XP. Le perdant ne perd
  rien (la mascotte boude, c'est tout) — l'enjeu est la fierté, pas la punition.
- C'est le format le plus sûr pour commencer : asynchrone, peu de messages réseau (un état agrégé
  quelques fois par heure), aucune donnée sensible échangée (juste un score d'activité normalisé).

### Ordre conseillé pour l'inter-serveurs

1. **Duel de mascottes** (8c) — le plus simple techniquement, valide le canal jeu du réseau.
2. **Quizz du samedi** (8b) — événement synchronisé, valide la diffusion simultanée.
3. **Croisade** (8a) — le plus ambitieux, s'appuie sur les deux précédents.

---

## 9) `+maitre` — Le Maître de guerre 👑 (roi de la colline)

**Alias** : `+trone`, `+koth` · **Accès** : 👥 Tous · **Catégorie** : Fun

Un **titre unique par serveur**, détenu par un seul membre à la fois. N'importe qui peut le défier.
Ça crée une rivalité permanente sans que personne n'ait rien à organiser.

### Mécanique

- **Trône vacant** (lancement ou destitution) : les deux premiers à cliquer « Prétendre au trône »
  s'affrontent, le gagnant est couronné.
- **`+maitre`** : affiche le tenant actuel, la durée de son règne, son palmarès de défenses, et un
  bouton ⚔️ **Défier**.
- **Le défi** : le challenger clique, le **tenant choisit l'arène** parmi les duels disponibles
  (morpion, rps, Puissance 4, `+warhammer` PvP, duel de réflexe façon `+bang`). Choisir son terrain
  est **l'avantage du tenant** — c'est voulu, ça pousse les challengers à devenir polyvalents.
- Le gagnant du duel prend (ou garde) le titre.

### Récompenses du règne

- **Revenu passif** : +30 XP par jour de règne, versé au `+daily` du tenant — **plafonné**
  (au-delà de 14 jours de règne consécutifs, le revenu est divisé par deux) pour qu'un tenant
  intouchable ne creuse pas un écart infini.
- **Rôle cosmétique** « 👑 Maître de guerre » (créé par `+maitre setup`, affiché en haut de la liste
  des membres comme les grades) — le vrai enjeu, c'est d'être vu.
- Ligne dédiée sur la carte `+level` du tenant, et badges via la section 5 :
  **« Usurpateur »** (prendre le titre 1/5/20 fois), **« Dynastie »** (règne de 7/30/100 jours).

### Anti-abus

- **1 défi max par challenger et par jour** (sinon le tenant se fait harceler).
- **Anti-esquive** : le tenant doit accepter **au moins un défi par 24 h** s'il y en a en attente.
  S'il esquive (ou est absent) 48 h avec des défis en file, le trône est déclaré **vacant** —
  impossible de camper le titre en refusant de jouer.
- File d'attente des défis : premier arrivé, premier servi ; le duel doit se jouer dans les 24 h.
- **Anti-arrangement** : le revenu passif étant plafonné et le titre unique, se « refiler » le trône
  entre amis ne rapporte rien de plus que de le garder — pas d'exploit économique possible.

---

## 10) `+imposteur` — L'Imposteur 🕵️ (bluff social)

**Alias** : `+undercover`, `+espion` · **Accès** : 👥 Tous · **Catégorie** : Fun

Le seul créneau que la gamme ne couvre pas du tout : le **jeu de bluff social**. Type
Undercover/Loup-garou light, jouable en ~5 minutes avec des boutons, 4 à 10 joueurs.

### Déroulé

1. **Lobby** : `+imposteur` ouvre les inscriptions (bouton 🎭 **Rejoindre**, 90 s, minimum 4 joueurs).
   Annonce possible au rôle 🎮 Joueur.
2. **Distribution** : chaque joueur clique 👁️ **Voir mon mot** (message éphémère). Les civils
   reçoivent tous le **même mot** (ex. « café ») ; l'imposteur reçoit un **mot voisin** (ex. « thé »).
   Lui donner un mot proche plutôt que rien est crucial : il peut donner des indices plausibles et
   le jeu devient un vrai duel de finesse, pas une loterie.
   - Pool de paires FR curatées (~150 paires : café/thé, plage/piscine, chevalier/samouraï…)
     \+ un **pack 40k** (bolter/fusil laser, Space Marine/Garde impérial…) pour la cohérence d'univers.
3. **Tour d'indices** : dans l'ordre affiché, chaque joueur donne **un indice d'un seul mot** dans le
   salon (30 s chacun, le bot repère le message du joueur au trait). Interdiction de dire son mot ou
   un dérivé direct — si le mot exact des civils est prononcé, l'auteur est éliminé sur-le-champ.
4. **Vote** : après chaque tour complet, vote par boutons éphémères (30 s). Le plus voté est éliminé
   et son camp est révélé. Égalité = personne n'est éliminé, tour d'indices supplémentaire.
5. **Fin de partie** :
   - L'imposteur est éliminé → **dernière chance** : il a 20 s pour **deviner le mot des civils**
     (via modal). S'il trouve, il **vole la victoire** — le twist qui fait les meilleures fins.
   - L'imposteur survit jusqu'à n'être plus qu'avec 2 civils → **victoire de l'imposteur**.

### Récompenses & intégration

- Victoire des civils : XP pour chaque civil (part modeste — ils sont plusieurs).
  Victoire de l'imposteur : **grosse part solo** (il gagne seul contre tous, dernière chance comprise).
- `recordGameResult()` : parties, victoires par camp — badges **« Maître espion »** (gagner en tant
  qu'imposteur 3/10/40 fois) et **« Fin limier »** (voter juste contre l'imposteur au premier tour 5/20/50 fois).
- AFK : un joueur qui laisse passer son temps d'indice deux fois est retiré de la partie (pas
  d'élimination votée gâchée sur un absent).
- Comptage dans `+gameleaderboard` / `+saison` comme les autres jeux.

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

1. **Stats par jeu (helper `recordGameResult`)** — à poser en premier : tous les nouveaux jeux
   l'appellent dès leur sortie, et les jeux existants s'y branchent un par un.
2. **Bouton Rejouer généralisé** — handler générique, puis activation jeu par jeu (gain immédiat
   sur les jeux existants, sans attendre les nouveaux).
3. **Défi quotidien `+defi`** — le meilleur rapport effort/rétention de toute la spec : démineur et
   memory existent déjà, il n'y a que la graine, l'unicité de l'essai et le récap de minuit à écrire.
4. **Drops surprise** — moteur d'activité pur, indépendant de tout le reste, réutilise le
   planificateur et les données `+pulse`.
5. **Blackjack** — le plus simple des trois jeux à mise (solo, pas de synchronisation
   multi-joueurs), valide les garde-fous de mise qui resservent pour la course.
6. **Puissance 4** — réutilise le squelette du morpion (invitation, tours, boutons, forfait).
7. **Course** — le plus riche (lobby, animation par éditions, paiements multiples), mais réutilise le
   système de mise du blackjack.
8. **Maître de guerre** — s'appuie sur les duels existants + Puissance 4 ; très peu de code propre
   (un état par serveur, une file de défis), gros effet de rivalité.
9. **L'Imposteur** — indépendant du reste, demande surtout la curation du pool de paires de mots.
10. **Badges** — une fois quelques semaines de stats accumulées, activer les badges (les seuils
    tombent juste si les compteurs existent déjà).
11. **Inter-serveurs** — la vision long terme, dans l'ordre : duel de mascottes → quizz du samedi →
    Croisade (voir section 8).
