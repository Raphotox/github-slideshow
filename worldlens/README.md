# WorldLens AI — Dossier de conception technique (CTO)

> **Vision** : transformer le smartphone en couche d'information intelligente sur le monde réel.
> L'utilisateur ouvre la caméra, regarde le monde, et tout devient interactif — « le ChatGPT du monde réel ».

Ce dossier est la réponse d'un CTO senior au brief produit : remise en question systématique,
amélioration des idées, architecture évolutive, optimisation des coûts, de la batterie et de la
confidentialité, et roadmap réaliste vers un produit de référence mondiale.

## Sommaire

| Document | Contenu |
|---|---|
| [01 — Analyse critique & décisions clés](01-analyse-critique.md) | Ce qui ne marchera pas tel quel, pourquoi, et ce qu'on fait à la place. Les 10 décisions structurantes. |
| [02 — Architecture](02-architecture.md) | Pipeline de perception hybride on-device/cloud, Entity Card, fusion de connaissances, agent conversationnel. |
| [03 — Stack technique](03-stack-technique.md) | Choix mobile (iOS-first natif), modèles de vision, backend géospatial, IA générative (API Claude). |
| [04 — Performance, batterie & coûts](04-performance-batterie-couts.md) | Budgets chiffrés, stratégie de cache à 3 niveaux, modèle de coût unitaire par session. |
| [05 — Confidentialité & conformité](05-confidentialite-legal.md) | RGPD, AI Act, personnes dans le champ, plaques, licences des sources de données. |
| [06 — Roadmap révisée](06-roadmap.md) | MVP resserré en 4 mois, jalons V1→V4, critères de kill/go, risques. |

## Résumé exécutif — les 5 messages que je veux faire passer

1. **Le produit est excellent, le principe technique du brief est à inverser.** « Analyser en permanence
   le flux vidéo avec les meilleurs modèles » est infaisable (batterie, coût, latence). La bonne
   architecture est une **pyramide de perception** : 90 % du travail fait par le contexte
   (GPS + orientation + bases géospatiales, quasi gratuit), 9 % par des modèles légers on-device,
   1 % par la vision multimodale cloud, déclenchée seulement quand l'utilisateur manifeste un intérêt.

2. **La donnée n'est pas la vision : c'est le fossé de la fusion.** Reconnaître « une cathédrale »
   est facile ; produire une fiche juste, sourcée et fusionnée depuis Wikidata/Wikipedia/OSM/etc.
   est le vrai produit. On construit un **graphe d'entités** pivoté sur les QID Wikidata, avec des
   **Entity Cards** pré-calculées, versionnées et mises en cache par tuile géographique.

3. **Le MVP ne doit pas être de l'AR world-locked.** Le mode « pointer + toucher pour scanner »
   avec des bulles 2D suivies à l'écran délivre 80 % de la valeur pour 20 % de l'effort. L'ancrage
   AR complet (bulles fixées dans l'espace, anti-chevauchement 3D) est la V2, pas le MVP.

4. **La confidentialité est un avantage compétitif, pas une contrainte.** Une caméra qui filme le
   monde en continu est un cauchemar RGPD/AI Act si on le traite après coup. Règles dès le jour 1 :
   jamais d'identification de personnes, jamais de lecture de plaques, images éphémères jamais
   stockées par défaut, traitement local prioritaire. C'est différenciant face aux géants.

5. **Le coût unitaire décide de la vie ou de la mort du produit.** Sans optimisation, une session
   de 10 min coûte ~1 € de cloud (mort assurée). Avec la pyramide de perception + cache d'entités +
   fiches pré-calculées, on vise **< 0,02 € par session** médiane. Tout le design découle de ce chiffre.

## Ce que ce dossier ajoute au brief (fonctionnalités non demandées)

- **Mode mains-libres audio** (« guide touristique dans l'oreille ») — la killer feature marche/vélo.
- **Scan différé** : photographier maintenant, explorer plus tard — règle le cas « pas le temps ».
- **Lens Score / boucle de contribution** : les corrections utilisateurs remontent vers Wikidata/OSM
  (moat communautaire, à la OpenStreetMap).
- **Mode enfant / éducation** (« explique comme si j'avais 8 ans » comme mode persistant, contrôle parental).
- **Accessibilité** : description du monde pour malvoyants — même pipeline, marché énorme, mission forte.
- **Time Machine léger avant la 3D** : photos historiques recalées en surimpression (coût 100× moindre
  que la reconstitution 3D, même émotion).
