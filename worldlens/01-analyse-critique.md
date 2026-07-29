# 01 — Analyse critique & décisions structurantes

Mission reçue : « Remets tout en question. » C'est fait ici, point par point. Chaque critique est
suivie d'une contre-proposition concrète. Les décisions sont numérotées **D1…D10** et référencées
dans le reste du dossier.

---

## 1. « L'application analyse en permanence le flux vidéo » — non, et voici pourquoi

C'est la phrase la plus dangereuse du brief. Faire tourner de la détection + reconnaissance +
vision multimodale sur 30 images/seconde :

- **Batterie** : une inférence neuronale continue sur NPU mobile + caméra + écran + GPS = 15–25 %
  de batterie par heure dans le meilleur des cas. L'utilisateur désinstalle.
- **Coût** : envoyer ne serait-ce qu'1 image/seconde à un modèle multimodal cloud coûte plusieurs
  euros de l'heure et par utilisateur. À 100 000 utilisateurs actifs, c'est une faillite.
- **Latence** : le cloud à 300–800 ms par image ne tiendra jamais un tracking fluide.
- **Inutile** : 95 % des frames sont redondantes (l'utilisateur regarde la même scène).

### Contre-proposition : la pyramide de perception (D1)

> **D1 — Le système est une pyramide : contexte → détection légère → compréhension profonde.
> Chaque étage ne se déclenche que si l'étage inférieur ne suffit pas, et la compréhension
> profonde ne se déclenche que sur signal d'intérêt de l'utilisateur.**

| Étage | Quoi | Où | Fréquence | Coût |
|---|---|---|---|---|
| 0. Contexte | GPS + boussole + gyroscope + tuiles OSM/Wikidata locales → « qu'est-ce qui est devant moi ? » | Local | continu | ~0 (données pré-téléchargées) |
| 1. Détection | Détecteur d'objets léger quantisé (classes génériques : bâtiment, plante, véhicule, nourriture, animal, panneau, œuvre…) + tracking | NPU local | 10–15 fps | batterie seulement |
| 2. Classification fine | Embeddings image (type CLIP mobile) + index local de POI proches, OCR local | NPU local | sur nouvel objet stable | batterie seulement |
| 3. Compréhension profonde | Modèle multimodal cloud : identification précise, description, désambiguïsation | Cloud | sur **dwell** (objet centré > ~800 ms) ou **tap** | payant — c'est la ressource rare |

Le point clé : **le monument, la montagne, la rue, le commerce — l'écrasante majorité des exemples
du brief — sont identifiables sans aucune vision**, juste par pose du téléphone + base géospatiale.
La vision sert à confirmer, désambiguïser, et couvrir les objets non géolocalisés (pizza, chien,
plante, tableau). C'est l'inversion mentale la plus importante du projet.

---

## 2. « Bulles sur tout ce qui est visible » — non : hiérarchie de saillance

Si tout est cliquable, rien n'est lisible. Une rue parisienne contient 40 objets détectables ;
40 bulles = illisible, anxiogène, et détruit la batterie.

> **D2 — Affichage par saillance : au plus 3–5 bulles simultanées, choisies par un score
> (taille à l'écran × centralité × intérêt intrinsèque × nouveauté × contexte utilisateur).
> Les autres objets sont marqués d'un simple point discret, expansible au regard/tap.**

Bénéfices : lisibilité, magie préservée (« l'app choisit bien »), et surtout **le score de saillance
est aussi le déclencheur de l'étage 3** — on ne paie le cloud que pour ce qui compte.

## 3. « Véritable AR world-locked » dès le début — non : c'est la V2 (D3)

L'ancrage parfait de panneaux dans l'espace, l'anti-chevauchement 3D, l'occlusion — c'est des mois
d'ingénierie AR pour un gain marginal au MVP. Le tracking 2D d'objets à l'écran (le rectangle suit
l'objet, la bulle suit le rectangle, interpolée par le flux optique + IMU) paraît déjà magique.

> **D3 — MVP : bulles 2D screen-space attachées aux boîtes trackées, lissées (filtre One-Euro).
> V2 : ancres ARKit/ARCore + placement 3D avec résolution de collisions. Le layout anti-chevauchement
> est traité comme un problème de label placement classique (greedy + forces répulsives), pas réinventé.**

## 4. Les « exemples » du brief ne sont pas un seul problème, mais sept verticales

Le brief énumère pizza, avion, étoile, plaque de rue, Nutri-Score… comme si c'était le même
problème. Non. Chaque famille a un pipeline dominant différent :

| Verticale | Signal dominant | Vision nécessaire ? | Source de vérité |
|---|---|---|---|
| Monuments, bâtiments, rues, montagnes | Géospatial (pose + tuiles) | confirmation seulement | Wikidata/Wikipedia/OSM, bases patrimoine |
| Nature (plantes, animaux, champignons) | Vision fine | oui, modèle spécialisé | GBIF, iNaturalist (licences à vérifier), Wikispecies |
| Nourriture & produits | Vision + **code-barres/OCR** | oui | OpenFoodFacts (le code-barres bat la vision 100 % du temps quand il est disponible) |
| Véhicules | Vision fine | oui | bases constructeurs/spec publiques |
| Aéronefs | **Pas la vision** : position + cap + ADS-B | non (juste « c'est un avion ») | flux ADS-B (attention licences OpenSky/adsb.lol) |
| Ciel (étoiles, planètes, ISS) | **Pas la vision** : éphémérides + capteurs | non | calcul astronomique local (offline par nature) |
| Œuvres d'art, OCR, documents | Vision multimodale + OCR | oui | bases musées, Wikidata, analyse IA |

> **D4 — Architecture en « résolveurs » par verticale derrière une interface unique.
> Le routeur choisit le(s) résolveur(s) selon le contexte. On lance le MVP avec 3 verticales
> excellentes (lieux/monuments, nature, produits) plutôt que 10 médiocres.**

Avion et étoiles sont des quick wins spectaculaires en démo (zéro ML, pur calcul) — parfaits pour
le marketing, à ajouter tôt mais après le cœur.

## 5. Reconnaissance fine des voitures : réduire l'ambition

« Audi Q2 2022, prix neuf » : la reconnaissance modèle+millésime est peu fiable (variantes,
facelifts), et **lire la plaque pour identifier le véhicule est interdit de fait** (donnée
personnelle, RGPD — voir doc 05). On livre marque + modèle probable + fiche générique, avec un
niveau de confiance affiché. Pas de plaques, jamais.

## 6. « Fusionner toutes les données publiques » : le vrai chantier, sous-estimé par le brief

Le brief liste 15 sources comme si les brancher suffisait. La réalité : entités dupliquées,
contradictions (hauteur de Notre-Dame selon la source), langues, licences hétérogènes, fraîcheur.

> **D5 — Graphe de connaissances pivoté sur Wikidata (QID comme identifiant universel).
> Chaque source est un adaptateur qui mappe vers le QID. La fusion produit une « Entity Card »
> canonique, versionnée, avec provenance par champ (chaque fait garde sa source) et score de
> confiance. La génération de la prose de la fiche est faite par LLM à partir des faits fusionnés,
> jamais de mémoire du modèle — le LLM rédige, il n'invente pas les faits.**

La provenance par champ n'est pas du luxe : c'est ce qui permet « Donne les sources » (demandé dans
le brief), la conformité aux licences (attribution CC-BY-SA), et la correction communautaire.

## 7. Hallucinations : le risque produit n°1 après le coût

Une app qui raconte avec aplomb des faits faux sur le monde réel meurt par la presse et les réseaux
en une semaine. Mitigations non négociables :

- Fiches = faits issus du graphe uniquement ; le LLM reformule et répond, contraint par le contexte fourni.
- Score de confiance visible (« Identification : probable / certaine ») ; en dessous d'un seuil, on
  dit « je ne suis pas sûr » et on propose des candidats.
- Bouton « Signaler une erreur » dès le MVP ; boucle de correction alimentant le graphe.
- Verticales à risque (champignons comestibles ? toxicité des plantes ? — demandé dans le brief) :
  bandeau de non-responsabilité explicite et refus de trancher la comestibilité.

## 8. Reconstitution historique (premium) : re-scoper

Voir un monument « comme il y a 500 ans » en 3D recalée = pipeline de production de contenu 3D par
site, coût énorme, couverture minuscule. Re-scoping en 3 paliers :

1. **Time Machine photo** (V2, coût faible) : photos/gravures anciennes géo-recalées en surimpression
   avec slider avant/après. Sources : archives publiques, Commons, bibliothèques nationales. Émotion
   forte, coût marginal.
2. **Récit génératif** (V2) : le LLM raconte le lieu à une époque donnée, avec sources.
3. **Reconstitutions 3D** (V3+) : uniquement pour ~20 sites phares, en partenariat (musées, UNESCO),
   comme contenu éditorialisé premium — pas comme feature générique.

## 9. Ce que le brief ne demande pas et qu'il faut décider maintenant

- **Compte utilisateur optionnel** au MVP (historique/favoris locaux d'abord) — réduit la friction
  et la surface RGPD.
- **i18n dès le jour 1** dans le schéma d'Entity Card (labels multilingues Wikidata gratuits) —
  une app « monde réel » est internationale par nature.
- **Télémétrie de qualité** (taux d'identification correcte, latence P95, coût/session) — sans ces
  métriques, impossible de piloter la pyramide de perception.
- **Mode offline dégradé** : tuiles + fiches des POI autour de l'utilisateur pré-téléchargées
  (voyageurs sans data — précisément le public cible n°1 : touristes à l'étranger).

## 10. Récapitulatif des décisions

| # | Décision |
|---|---|
| D1 | Pyramide de perception ; cloud multimodal uniquement sur dwell/tap |
| D2 | Max 3–5 bulles par saillance ; points discrets pour le reste |
| D3 | MVP en tracking 2D screen-space ; AR world-locked en V2 |
| D4 | Résolveurs par verticale ; MVP = lieux + nature + produits |
| D5 | Graphe pivoté Wikidata/QID ; Entity Card versionnée avec provenance par champ |
| D6 | Zéro identification de personnes, zéro lecture de plaques, images éphémères (doc 05) |
| D7 | iOS-first natif Swift/ARKit ; Android 6 mois après (doc 03) |
| D8 | Coût cible < 0,02 €/session médiane ; budget batterie < 8 %/h (doc 04) |
| D9 | LLM rédige/répond à partir de faits fournis, n'invente jamais ; confiance affichée |
| D10 | MVP resserré : « point & discover » 3 verticales, 1 ville pilote, 4 mois (doc 06) |
