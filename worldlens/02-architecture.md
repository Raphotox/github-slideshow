# 02 — Architecture

Objectif : une architecture qui délivre la magie du brief tout en respectant D1 (pyramide de
perception), D5 (graphe d'entités) et D8 (coût/batterie). Deux moitiés : **l'appareil** (perception
temps réel, UX, cache) et **le cloud** (identification profonde, connaissance, conversation).

```
┌────────────────────────── APPAREIL ──────────────────────────┐
│  Caméra ─► Détecteur léger (NPU, 10-15fps) ─► Tracker ─► UI  │
│     │            │                                │          │
│  Capteurs     Embeddings/OCR local          Bulles (saillance)│
│  GPS/IMU         │                                │          │
│     └──► Moteur de contexte ◄── Tuiles locales (POI/fiches)  │
│                  │  (candidats géospatiaux)                  │
│         Déclencheur (dwell/tap) ── seulement si nécessaire   │
└──────────────────┼───────────────────────────────────────────┘
                   ▼ (crop image + pose + candidats)
┌────────────────────────── CLOUD ─────────────────────────────┐
│ API Gateway ─► Résolveur d'identité (routeur par verticale)  │
│                  │ vision multimodale / VPS / codes-barres    │
│                  ▼                                            │
│        Graphe d'entités (pivot Wikidata QID)                  │
│    adaptateurs: Wikipedia·Wikidata·OSM·OpenFoodFacts·GBIF·…   │
│                  ▼                                            │
│        Entity Card Service (fusion, versionnée, CDN)          │
│                  ▼                                            │
│        Agent conversationnel (LLM + outils + recherche web)   │
└───────────────────────────────────────────────────────────────┘
```

---

## 1. Côté appareil

### 1.1 Moteur de contexte (étage 0) — le cœur silencieux

En continu et sans réseau : à partir de la pose (GPS fusionné + boussole + gyroscope + verticale),
il calcule le **frustum géographique** — le cône de ce que voit la caméra — et l'intersecte avec les
tuiles locales de POI (téléchargées autour de l'utilisateur, indexation H3). Résultat : une liste de
candidats « ce bâtiment devant à 120 m est probablement Q2981 (Notre-Dame) » avec priors de
probabilité. Gère aussi les cas non visuels : avions (ADS-B), ciel (éphémérides), relief
(modèle numérique de terrain pour nommer les sommets à l'horizon).

### 1.2 Perception (étages 1–2)

- **Détecteur générique** temps réel quantisé (Core ML / NNAPI), ~15–30 classes grossières.
  10–15 fps suffisent, l'interpolation visuelle fait le reste.
- **Tracking multi-objets** léger (association IoU + flux optique + IMU) : identité stable des
  objets, apparition/disparition propre des bulles (demande explicite du brief).
- **Classification fine locale** : embedding d'image compact par objet stable ; comparaison à un
  index local (produits courants, espèces communes régionales, POI proches). OCR système
  (Vision/ML Kit) pour panneaux, menus, étiquettes — gratuit et excellent.
- **Politique d'énergie** : caméra baissée → capteurs coupés ; scène statique → fréquence réduite ;
  batterie < 20 % → mode économie (étage 3 sur tap uniquement).

### 1.3 Déclencheur de l'étage 3 (la décision la plus rentable de l'app)

Un appel cloud part **uniquement** si : (objet au centre pendant > ~800 ms **ou** tap) **et**
(la confiance locale est insuffisante) **et** (l'entité n'est pas déjà en cache). On envoie un
**crop** de l'objet (pas la frame entière), la pose, et les candidats de l'étage 0 — le cloud
confirme plus souvent qu'il ne découvre, ce qui est 10× moins cher qu'une identification aveugle.

### 1.4 Cache local

- Tuiles POI + Entity Cards des ~500 POI environnants, pré-chargées (fond de tâche, Wi-Fi de
  préférence) → l'essentiel de l'expérience touristique marche **offline**.
- LRU des entités déjà vues (une pizza re-scannée ne repart pas au cloud).
- Historique et favoris stockés localement d'abord (voir doc 05).

---

## 2. Côté cloud

### 2.1 Résolveur d'identité (routeur par verticale — D4)

Entrée : crop(s) + pose + candidats + contexte. Le routeur invoque le(s) résolveur(s) pertinent(s) :

| Résolveur | Technique |
|---|---|
| Lieux/monuments | Réconciliation géospatiale des candidats ; si ambigu, reconnaissance visuelle de lieu (retrieval d'images de référence par POI) ; VPS plus tard (V2+) pour la pose fine |
| Nature | Classifieur d'espèces spécialisé (fine-tuné, par région) |
| Produits | Code-barres > OCR d'étiquette > vision ; jointure OpenFoodFacts |
| Générique | Modèle multimodal (vision LLM) : décrit, classe, désambiguïse entre candidats, lit le texte |
| Aéronefs / ciel | Pur calcul (ADS-B, éphémérides) — peut même rester on-device |

Sortie normalisée : `{qid?, type, label, confiance, alternatives[]}`. En dessous du seuil de
confiance, l'UI présente les alternatives au lieu d'affirmer (D9).

### 2.2 Graphe d'entités & Entity Card (D5)

- **Ingestion** : pipelines batch (dumps Wikidata/Wikipedia/OSM, OpenFoodFacts, GBIF, bases
  patrimoine/musées/UNESCO) + rafraîchissements incrémentaux. Chaque adaptateur mappe vers le QID ;
  réconciliation d'entités (nom + géo + type) pour les sources sans QID.
- **Entity Card** : document canonique par entité — labels multilingues, résumé, faits typés
  (chacun avec source, licence, date de fraîcheur), médias (Commons), liens, géométrie.
  Générée par fusion déterministe + rédaction LLM **contrainte aux faits fournis**, en batch pour
  les POI populaires (coût LLM divisé par ~2 via l'API batch), à la volée puis cachée pour la
  longue traîne.
- **Distribution** : cards pré-rendues par langue sur CDN, versionnées ; l'app ne parle presque
  jamais aux services chauds pour une entité connue. C'est ce qui rend le coût marginal ~nul.

### 2.3 Agent conversationnel (« le bouton de chaque bulle »)

Un agent LLM par conversation, avec en contexte : l'Entity Card complète (faits + provenance), la
position de l'utilisateur, le crop de l'image, et l'historique. Outils : recherche dans le graphe,
recherche web (pour l'info récente — demande du brief), comparaison d'entités, générateur de résumé
audio (TTS), mode « explique-moi comme si j'avais 8 ans » (simple instruction de style).
Streaming token par token vers l'app ; les réponses citent leurs sources (D9).
Choix de modèles et coûts : doc 03 §4 et doc 04.

### 2.4 Infrastructure

- Services stateless (gateway, résolveurs, cards, agent) sur Kubernetes ou serverless containers ;
  autoscaling sur la latence P95.
- **PostgreSQL + PostGIS** (vérité géospatiale) ; index vectoriel (pgvector au début) pour le
  retrieval visuel/textuel ; Redis pour le cache chaud ; stockage objet pour tuiles/médias ; CDN devant tout.
- File d'événements (ingestion, régénération de cards, corrections utilisateurs).
- Observabilité pilotée par 4 métriques produit : précision d'identification, latence P95 tap→bulle
  renseignée, coût/session, %batterie/h.

---

## 3. Parcours type (ce que ça donne en vrai)

1. Ouverture app à côté de Notre-Dame. Étage 0 : les tuiles locales listent déjà 22 POI dans le
   frustum. **Avant toute vision**, une bulle 🏰 « Notre-Dame de Paris » (card en cache) apparaît,
   ancrée sur la boîte que le détecteur local a posée sur le bâtiment. Latence perçue : < 300 ms,
   coût cloud : 0.
2. L'utilisateur cadre une plante sur le parvis 1 seconde (dwell). Confiance locale faible → un crop
   part au résolveur nature → « Platane commun, probable à 88 % » + card. Coût : une inférence
   spécialisée, pas de LLM.
3. Il touche la bulle et demande « pourquoi la flèche a brûlé ? ». L'agent répond en streaming à
   partir de la card + recherche web pour les faits récents, sources citées.
4. Il lève le téléphone vers un avion : résolveur ADS-B, zéro ML — compagnie, vol, destination,
   altitude. Effet démo maximal, coût quasi nul.
