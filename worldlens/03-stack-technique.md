# 03 — Stack technique

Critère de choix : maximiser la vitesse d'itération du MVP sans hypothéquer la V2 (AR complète)
ni la scalabilité. Quand deux options se valent, je prends celle qui réduit le coût unitaire.

## 1. Mobile (D7 : iOS-first natif)

| Option | Verdict |
|---|---|
| **Swift + ARKit + RealityKit (iOS-first)** | ✅ **Choisi.** Meilleure intégration caméra/NPU (Core ML, Vision), LiDAR sur Pro pour la profondeur, ARKit est le meilleur SLAM grand public. Le public early-adopter/presse est sur iPhone. |
| Unity + AR Foundation | Cross-platform AR séduisant, mais runtime lourd, batterie moins bonne, UX « app native » difficile — pertinent si on pivotait vers le jeu. |
| Flutter / React Native | Très mauvais fit : tout le cœur (caméra, NPU, AR) passerait par des ponts natifs. On paierait la couche cross-platform sans en profiter. |

Android (Kotlin + ARCore + NNAPI/LiteRT) démarre ~6 mois après, quand le produit est validé — la
couche partagée est le **backend et les contrats d'API**, pas l'UI. Ce qui est mutualisé côté
client : schémas (protobuf/OpenAPI), logique de tuiles/cache (Rust ou Kotlin Multiplatform possible,
à trancher au moment du portage Android — pas de sur-ingénierie avant).

## 2. Modèles de vision

| Rôle | Choix | Notes |
|---|---|---|
| Détection temps réel on-device | Détecteur type YOLO/RT-DETR distillé et quantisé (int8) vers Core ML | 15–30 classes grossières ; ~10-20 ms/frame sur NPU récent |
| Embeddings locaux | Encodeur type MobileCLIP/SigLIP compact | Retrieval local + signature d'objet pour le cache |
| OCR | Apple Vision (puis ML Kit sur Android) | Gratuit, multilingue, excellent — ne rien réentraîner |
| Espèces (nature) | Classifieur spécialisé fine-tuné, éventuellement distillé on-device pour les 500 espèces communes régionales | Données : GBIF + datasets académiques (vérifier licences) |
| Reconnaissance de lieu | Retrieval d'images de référence par POI (embeddings + index vectoriel) ; VPS (ex. Google Geospatial API) évalué en V2 pour la pose fine | Le géospatial fait déjà 90 % du travail |
| Profondeur/SLAM | ARKit/ARCore natif (LiDAR quand présent) | Ne jamais réimplémenter |
| Vision multimodale cloud | LLM multimodal (voir §4) | Désambiguïsation, description, OCR complexe, œuvres d'art |

## 3. Backend

- **Langages** : Go ou TypeScript pour les services API (peu importe, discipline > langage) ;
  **Python** pour les pipelines data/ML (écosystème).
- **Données** : PostgreSQL + PostGIS (+ pgvector) ; Redis ; stockage objet S3-compatible ; CDN.
  Indexation géo par cellules H3. Pas de « vector DB » dédiée ni de Kafka au MVP — pgvector et une
  file simple suffisent largement ; on montera en gamme sur preuve de charge.
- **Ingestion** : jobs batch orchestrés (dumps hebdo Wikidata/OSM + deltas), idempotents,
  re-jouables. La qualité des adaptateurs de sources est un investissement continu — c'est le moat.
- **API app↔cloud** : HTTP/2 + protobuf, streaming SSE pour l'agent conversationnel.

## 4. IA générative (fiches + conversation) — API Claude

Deux usages distincts, deux réglages :

| Usage | Modèle | Pourquoi |
|---|---|---|
| **Agent conversationnel** (bouton de la bulle, questions libres, comparaison, « explique-moi ») | **Claude Opus 5** (`claude-opus-5`) | Meilleur rapport capacité/prix du tiers frontière (5 $/M tokens entrée, 25 $/M sortie) ; multimodal (le crop de l'objet part dans le contexte) ; outils natifs **web search / web fetch** côté serveur — exactement la « recherche Internet » du brief, avec citations. |
| **Rédaction batch des Entity Cards** + classification/routage bon marché | **Claude Haiku 4.5** (`claude-haiku-4-5`, 1 $/5 $) pour le volume ; Opus 5 pour les 10 000 POI phares | Les cards sont générées hors ligne : l'API **Batch** et le **prompt caching** (lectures à ~0,1× du prix d'entrée) écrasent le coût. |

Points d'implémentation :

- `thinking: {type: "adaptive"}` (comportement par défaut sur Opus 5) + `output_config.effort` bas
  pour les réponses courtes conversationnelles, plus élevé pour les comparaisons/analyses.
- **Prompt caching agressif** : le système + l'Entity Card sont le préfixe stable de la
  conversation ; chaque question suivante ne paie que le delta. Concrètement : cache_control sur le
  bloc card, questions après.
- **Structured outputs** (`output_config.format`) pour tout ce qui doit être machine-lisible
  (classification de l'intention, extraction de faits, routage de verticale).
- Streaming systématique vers l'app ; TTS pour le résumé audio (voix système iOS d'abord, voix
  neurale premium ensuite).
- Garde-fou D9 dans le prompt système : « les faits proviennent exclusivement du contexte fourni ;
  si l'information n'y est pas, dis-le ou utilise la recherche web et cite la source ».

## 5. Sources de données (adaptateurs, par priorité)

| Priorité | Source | Usage | Licence/contrainte |
|---|---|---|---|
| P0 | Wikidata | pivot d'identité, faits structurés multilingues | CC0 ✅ |
| P0 | Wikipedia | résumés, articles | CC-BY-SA → attribution obligatoire dans l'UI |
| P0 | OpenStreetMap | géométries, POI, rues | ODbL → attribution + share-alike sur la base dérivée (à cadrer juridiquement) |
| P0 | Wikimedia Commons | images | licences par média, à propager |
| P1 | OpenFoodFacts | produits | ODbL |
| P1 | GBIF | espèces | citations par dataset |
| P1 | Éphémérides (données astronomiques publiques) | ciel | libre |
| P1 | ADS-B (OpenSky/adsb.lol) | avions | conditions non commerciales chez certains → contrat ou fournisseur payant en prod |
| P2 | Bases patrimoine (Mérimée, UNESCO…), musées ouverts, OpenLibrary, OpenAlex, météo (Open-Meteo/METAR) | enrichissements | au cas par cas |

Règle : chaque adaptateur documente sa licence et son mode d'attribution **avant** intégration ;
l'attribution est portée par champ dans l'Entity Card (D5), donc l'UI peut toujours l'afficher.
