# 05 — Confidentialité & conformité (D6)

Une application qui pointe une caméra sur le monde en continu est, par défaut, un problème
juridique et de réputation. Traité dès la conception, c'est au contraire un argument de marque
(« la couche d'information qui ne surveille personne »). Principes non négociables, puis détail.

## 1. Principes produit (affichés publiquement)

1. **Aucune identification de personnes. Jamais.** Ni reconnaissance faciale, ni ré-identification,
   ni estimation d'âge/genre/émotion. Les personnes détectées par l'étage 1 sont un masque
   d'exclusion : aucune bulle, aucun crop les contenant n'est envoyé au cloud (floutage des zones
   résiduelles avant tout envoi).
2. **Aucune lecture de plaques d'immatriculation** (donnée personnelle indirecte). Zone masquée,
   comme les visages.
3. **Images éphémères par défaut** : les frames restent sur l'appareil ; seuls des crops d'objets
   non humains partent au cloud, traités en mémoire, **jamais stockés** par défaut. Conservation
   uniquement sur action explicite (favori, signalement d'erreur) — et c'est dit à l'utilisateur.
4. **Local d'abord** : tout ce qui peut être calculé sur l'appareil l'est (détection, OCR, ciel,
   historique, favoris). Le compte est optionnel au MVP.
5. **Transparence** : indicateur visible quand quelque chose part au cloud ; page « ce que
   WorldLens voit et garde » en langage humain.

## 2. RGPD — points concrets

- **Base légale** : exécution du contrat pour la fonction cœur ; consentements séparés pour
  l'historique cloud/sync et la télémétrie détaillée. Pas de dark patterns.
- **Position GPS** = donnée personnelle : traitée avec précision réduite côté serveur (tuile plutôt
  que coordonnée exacte), logs de position à TTL courts, jamais revendue (modèle économique : voir
  doc 06 — on ne vend pas la donnée, c'est aussi un choix business).
- **Droits** : export/suppression en libre-service ; l'historique local se supprime en supprimant l'app.
- **DPIA** (analyse d'impact) obligatoire vu la nature du produit — à faire avant le lancement
  public, pas après.
- **Mineurs** : mode enfant → pas de compte, pas de télémétrie, contenu filtré.

## 3. AI Act & réglementation à venir

- L'interdiction des systèmes d'identification biométrique et de scraping facial conforte D6 :
  notre position « zéro reconnaissance de personnes » nous garde loin des catégories interdites/haut risque.
- Transparence IA : les contenus générés (fiches rédigées, réponses de l'agent, reconstitutions
  historiques) sont signalés comme tels ; les faits citent leurs sources (D5/D9 rendent ça naturel).
- Les lois locales sur l'enregistrement dans l'espace public varient (ex. façades privées,
  musées interdisant la photo) : géofencing de politesse sur les lieux sensibles (écoles,
  hôpitaux, lieux de culte en offices) — pas de bulles commerciales là-dessus.

## 4. Licences de données (rappel du doc 03, sous l'angle risque)

- **CC-BY-SA (Wikipedia)** : attribution visible dans chaque fiche + partage à l'identique sur les
  extraits — l'UI a un pied de fiche « Sources » systématique (déjà exigé par D9).
- **ODbL (OSM, OpenFoodFacts)** : attribution + question du « derived database » sur notre graphe
  fusionné → avis juridique avant lancement ; l'architecture par provenance de champ permet
  d'isoler proprement ce qui dérive d'ODbL.
- **ADS-B** : les flux communautaires gratuits sont souvent non commerciaux → contrat commercial ou
  fournisseur payant avant monétisation de la verticale avions.
- **Musées/œuvres** : la photo d'une œuvre récente peut être soumise au droit d'auteur ; l'analyse
  IA d'une œuvre affichée en musée est OK, sa reproduction dans nos caches ne l'est pas toujours —
  règle : on cache les métadonnées, pas l'image de l'œuvre, sauf licence claire (Commons).

## 5. Sécurité

- Chiffrement en transit (TLS partout) et au repos ; les crops en file de traitement chiffrés et TTL < minutes.
- Cloisonnement : le service de conversation ne voit que l'Entity Card et le crop, pas l'historique
  de position brute.
- Modération de l'agent : refus des usages de surveillance (« qui habite ici ? », « suis cette
  personne »), listes rouges testées en red team avant chaque release.
- Programme de bug bounty dès la V1 publique.
