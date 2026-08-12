#!/usr/bin/env bash
# Suivi du statut du bot (lancé toutes les 10 min par comeback.yml).
# Lit heartbeat.json sur la branche `status` via l'API (pas le cache CDN de raw),
# calcule en ligne / hors ligne (seuil 10 min, comme le badge du site), compare à
# l'état mémorisé dans le corps de l'issue « 📟 Suivi du statut du bot », et en cas
# de transition ajoute un commentaire mentionnant @saliox → notification GitHub
# (mail + appli mobile). Silencieux tant que rien ne change.
# Pourquoi pas un déclencheur push sur `status` ? La branche est force-poussée par
# le bot et ne contient pas .github/workflows → GitHub n'y déclenche rien.
set -euo pipefail
TZ=Europe/Paris; export TZ

TITLE='📟 Suivi du statut du bot'
LABEL='bot-statut'
SEUIL=600  # secondes sans heartbeat avant « hors ligne » (aligné sur le badge du site)

# ── Lecture du heartbeat (échec réseau → on sort sans rien changer, pas de fausse alerte)
AT_MS=$(gh api "repos/$GH_REPO/contents/heartbeat.json?ref=status" --jq .content 2>/dev/null | base64 -d | jq -r '.at // 0') || { echo 'heartbeat injoignable — on ne change rien'; exit 0; }
[ "$AT_MS" -gt 0 ] || { echo 'heartbeat illisible — on ne change rien'; exit 0; }
NOW=$(date +%s)
AGE=$(( NOW - AT_MS / 1000 ))
CUR=offline; [ "$AGE" -lt "$SEUIL" ] && CUR=online
# Début de l'état courant : maintenant si en ligne, dernier heartbeat si hors ligne
# (sinon la première alerte 🟢 sous-estimerait la durée d'interruption).
REF=$NOW; [ "$CUR" = offline ] && REF=$(( AT_MS / 1000 ))
echo "dernier heartbeat il y a ${AGE}s → état courant : $CUR"

corps() { # corps de l'issue = état mémorisé ($1=etat, $2=epoch de la transition)
  printf '_État mémorisé par `comeback.yml` — ne pas modifier les deux lignes ci-dessous._\n\netat: %s\ndepuis: %s\n\nCe fil reçoit un commentaire à chaque changement d'\''état du bot (🟢 retour en ligne / 🔴 plus de heartbeat). Ferme les notifications ici si tu n'\''en veux plus, ou supprime le workflow `comeback.yml`.\n' "$1" "$2"
}

duree() { # $1 = secondes → « X j Y h » ou « X h Y min »
  local s=$1 h=$(( $1 / 3600 ))
  if [ "$h" -ge 48 ]; then echo "$(( h / 24 )) j $(( h % 24 )) h"; else echo "$h h $(( (s % 3600) / 60 )) min"; fi
}

# ── Issue de suivi (créée au premier passage, état initial mémorisé sans alerte)
N=$(gh issue list --label "$LABEL" --state open --json number --jq '.[0].number // empty')
if [ -z "$N" ]; then
  gh label create "$LABEL" --color 57F287 --description 'Suivi automatique du statut du bot (comeback.yml)' --force || true
  gh issue create --title "$TITLE" --label "$LABEL" --body "$(corps "$CUR" "$REF")"
  echo "issue de suivi créée (état initial : $CUR) — pas d'alerte"
  exit 0
fi

PREV=$(gh issue view "$N" --json body --jq .body | sed -n 's/^etat: //p' | head -n1)
DEPUIS=$(gh issue view "$N" --json body --jq .body | sed -n 's/^depuis: //p' | head -n1)
[ -n "$PREV" ] || PREV=offline
[ -n "$DEPUIS" ] || DEPUIS=$NOW
if [ "$PREV" = "$CUR" ]; then echo "pas de changement ($CUR) — silencieux"; exit 0; fi

# ── Transition → commentaire (notifie) + mise à jour de l'état
QUAND=$(date '+%d/%m/%Y à %H:%M')
if [ "$CUR" = online ]; then
  MSG="🟢 @saliox — le bot est **de retour en ligne** ($QUAND, heure de Paris) après **$(duree $(( NOW - DEPUIS )))** hors ligne.

À faire maintenant que tu as la main :
- [ ] Vérifier le badge au vert : https://saliox.github.io/hasu-protect-docs/
- [ ] Porter les sections de \`.github/SYNC-BOT.md\` dans le template local **avant** toute « maj site » (sinon la sentinelle sonnera)
- [ ] Garder le bot en ligne pour la review top.gg"
else
  MSG="🔴 @saliox — le bot **ne répond plus** : dernier heartbeat le $(date -d "@$(( AT_MS / 1000 ))" '+%d/%m/%Y à %H:%M') (détecté le $QUAND heure de Paris, après **$(duree $(( NOW - DEPUIS )))** en ligne)."
fi
gh issue comment "$N" --body "$MSG"
gh issue edit "$N" --body "$(corps "$CUR" "$REF")"
echo "transition $PREV → $CUR signalée sur l'issue #$N"
