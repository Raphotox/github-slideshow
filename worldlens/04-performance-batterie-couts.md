# 04 — Performance, batterie & coûts

Le brief demande « extrêmement fluide, peu de batterie, peu de latence, cache intelligent, calcul
local, cloud seulement si nécessaire ». Voici les budgets chiffrés et les mécanismes qui les tiennent.

## 1. Budgets (SLO produit)

| Métrique | Cible MVP | Cible V2 |
|---|---|---|
| Latence apparition bulle (entité en cache, étage 0-1) | < 300 ms | < 200 ms |
| Latence tap → fiche renseignée (étage 3 cloud) | < 2,5 s P95 | < 1,5 s P95 |
| Premier token de l'agent conversationnel | < 1,5 s | < 1 s |
| Batterie en usage actif | < 8 %/h | < 6 %/h |
| Échauffement | jamais de throttling thermique en usage 10 min | idem |
| Coût cloud / session médiane (10 min) | **< 0,02 €** | < 0,01 € |
| Précision d'identification (top-1, verticales MVP) | > 90 % | > 95 % |

Ces sept chiffres sont **les** métriques de pilotage ; toute feature qui en dégrade une doit le justifier.

## 2. Batterie : d'où viennent les 8 %/h

Postes : caméra + écran (~4-5 %/h, incompressible), NPU détection (~1-2 %/h à 10-15 fps),
GPS/capteurs (~0,5-1 %/h en mode fusionné), radio (marginal grâce au cache). Leviers :

1. **Fréquence adaptative** : détection à 15 fps quand la scène bouge, 2-3 fps quand elle est
   statique (delta de frames + gyroscope) — le tracking interpole entre les inférences.
2. **Tout à l'arrêt quand le téléphone est baissé** (accéléromètre) — l'utilisateur marche
   téléphone en main la plupart du temps.
3. Modèles int8 sur NPU exclusivement (jamais GPU pour l'inférence continue).
4. Pré-chargement des tuiles en Wi-Fi/charge (BGTaskScheduler), radio froide en usage.
5. Budget thermique surveillé : on dégrade la fréquence avant que l'OS ne throttle.

## 3. Coût : le modèle unitaire

Session médiane cible (10 min, touriste) : ~25 entités vues, dont ~20 résolues par
l'étage 0 + cache (coût ~0), ~4 par inférence spécialisée cloud (~0,001 € pièce), ~1 conversation
LLM (3 échanges).

Conversation type avec Claude Opus 5 : préfixe (système + Entity Card) ~3 000 tokens **caché**
(~0,1× le prix d'entrée après le premier tour), questions ~50 tokens, réponses ~250 tokens.
≈ 3 × [3k × 0,5 $/M (lecture cache) + 300 × 5 $/M + 250 × 25 $/M] ≈ **0,03 $** la conversation.
→ Session médiane ≈ 0,01-0,02 €. Sans le cache d'entités ni le prompt caching, la même session
coûterait 30 à 50× plus. Les mécanismes ne sont pas des optimisations, ce sont les conditions
d'existence du produit.

Leviers structurels :

- **Entity Cards pré-calculées** (batch API, −50 %) et servies par CDN : le LLM ne rédige chaque
  fiche qu'une fois par version, pas une fois par utilisateur.
- **Prompt caching** sur le couple (système, card) pour toute la conversation.
- **Routage de modèles** : Haiku 4.5 pour classification/routage/extraction, Opus 5 pour la
  conversation visible. Jamais de LLM là où un calcul suffit (avions, ciel, code-barres).
- **Crops, pas de frames entières** ; jamais de vidéo vers le cloud.
- Quotas free tier (n conversations profondes/jour) ; l'illimité est premium — voir doc 06.

## 4. Cache à 3 niveaux (récapitulatif)

| Niveau | Contenu | Invalidation |
|---|---|---|
| Appareil | Tuiles POI + cards autour de l'utilisateur, LRU des entités vues, historique | version de card ; rayon glissant |
| CDN | Entity Cards rendues par langue, médias, tuiles | purge à la régénération (versionnée) |
| Serveur (Redis) | Résolutions récentes par zone, résultats de retrieval, réponses fréquentes de l'agent | TTL courts |

## 5. Fluidité perçue (autant UX que technique)

- La bulle apparaît **dès l'étage 0-1** avec le label probable, puis s'enrichit quand l'étage 3
  répond — jamais de spinner plein écran.
- Animations pilotées par le tracker interpolé (60 fps UI même si l'inférence est à 10 fps),
  lissage One-Euro, hystérésis d'apparition/disparition (une bulle ne clignote jamais).
- Streaming token par token dans la fiche conversationnelle.
- Dégradations honnêtes : hors ligne → cards en cache + verticales calculatoires (ciel !) ;
  GPS urbain imprécis → on élargit le frustum et on assume l'ambiguïté (choix proposé à l'utilisateur).
