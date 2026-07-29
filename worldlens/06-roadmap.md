# 06 — Roadmap révisée (D10)

La roadmap du brief (MVP → V5 « application mondiale de référence ») est une échelle d'ambition,
pas un plan. Voici un plan : chaque phase a un périmètre fermé, des critères de succès mesurables
et un critère d'arrêt. Règle générale : **une expérience excellente sur un périmètre étroit bat
une expérience moyenne sur un périmètre large** — c'est encore plus vrai pour un produit « magique ».

## Phase 0 — Preuve technique (4–6 semaines, avant tout engagement)

Prototype jetable qui répond aux trois seules questions qui comptent :

1. Le frustum géospatial + tuiles POI identifie-t-il correctement les monuments/commerces dans une
   vraie rue (GPS urbain dégradé compris) ?
2. Le pipeline détection→tracking→bulle 2D est-il « magique » à l'œil sur un iPhone de 3 ans ?
3. Le coût réel d'une session instrumentée est-il dans l'épure du doc 04 ?

**Kill criteria** : si (1) < 80 % de précision dans la ville pilote après tuning, le concept
« ça marche sans viser » doit être revu (fallback : expérience tap-first).

## Phase 1 — MVP « Point & Discover » (4 mois, iOS, 1 ville pilote : Paris)

Périmètre (rien d'autre) :

- Caméra + bulles 2D trackées (D3), max 5 bulles par saillance (D2).
- 3 verticales excellentes (D4) : **lieux/monuments/rues**, **nature commune**, **produits
  (code-barres + étiquettes)** + OCR/traduction de panneaux (gratuit et utile au quotidien).
- Entity Cards pour ~50 000 POI parisiens pré-calculées, offline pack de la ville.
- Agent conversationnel par bulle (Claude Opus 5, streaming, sources citées), 10 questions/jour gratuites.
- Historique + favoris locaux ; signalement d'erreur ; privacy by design complet (doc 05).

Succès (fin de phase) : précision top-1 > 90 % sur les 3 verticales dans la ville pilote ;
> 35 % des sessions avec au moins une conversation ; coût/session < 0,02 € ; NPS testeurs > 50.

## Phase 2 — V1 publique + verticales spectaculaires (3 mois)

- Extension : 20 villes européennes (le pipeline de tuiles/cards rend l'ajout de villes industriel).
- Verticales **avions** et **ciel** (démos virales, coût ~nul) ; météo contextuelle.
- Mode audio mains-libres (guide dans l'oreille) — première brique de la killer feature.
- Compte optionnel + sync ; premium light (conversations illimitées, packs offline monde).

## Phase 3 — V2 « vraie AR » + Time Machine (6 mois)

- Ancrage world-locked ARKit, placement 3D anti-chevauchement, occlusion (LiDAR).
- VPS pour la pose fine dans les zones denses.
- **Time Machine photo** (photos historiques recalées, slider avant/après) — le premium
  « reconstitution » re-scopé (doc 01 §8).
- Android (ARCore) — lancé sur le produit validé, pas avant.

## Phase 4 — V3+ (au mérite, selon traction)

- Reconstitutions 3D éditorialisées sur ~20 sites phares (partenariats musées/UNESCO).
- Boucle communautaire complète : corrections → graphe → (reversement vers Wikidata/OSM), annotations
  publiques modérées, contenus de créateurs (guides de quartier).
- Assistant vocal complet, accessibilité malvoyants en produit à part entière.

## Modèle économique (décidé tôt car il contraint l'architecture)

- **Freemium** : cœur gratuit avec quotas ; premium (~6-8 €/mois) = conversations illimitées,
  audio-guide, Time Machine, packs offline monde.
- **B2B ensuite** : tourisme (offices, musées — contenus officiels dans leurs lieux), éducation.
- **Jamais** : vente de données de localisation, publicité ciblée sur les lieux visités. (Cohérent
  avec doc 05, et c'est un argument de marque.)

## Risques majeurs & parades

| Risque | Prob. | Parade |
|---|---|---|
| Google/Apple sortent la même chose | Élevée | Vitesse + profondeur des fiches (fusion + sources) + communauté + posture privacy ; viser l'excellence sur des verticales qu'ils négligent (patrimoine, nature, éducation) |
| GPS urbain trop imprécis → mauvaises identifications | Moyenne | Frustum élargi + désambiguïsation visuelle + UI qui assume l'incertitude (D9) ; VPS en V2 |
| Coût cloud dérape avec l'usage réel | Moyenne | Le coût/session est un SLO monitoré par release ; quotas free tier ; kill switch de features coûteuses |
| Hallucination médiatisée | Moyenne | D9 (faits sourcés uniquement), confiance affichée, signalement, red team éditorial avant chaque ville |
| Fatigue du form factor (« tenir son téléphone levé ») | Moyenne | Mode audio mains-libres + scan différé ; à terme, ce produit est le candidat idéal pour les lunettes AR — l'architecture (perception locale + cards CDN) y est portable telle quelle |

## L'étoile polaire

Une seule métrique produit : **« moments de découverte » par session** (bulle ouverte + fiche lue
> 5 s ou question posée). Tout le reste — précision, latence, coût — sert cette métrique.
