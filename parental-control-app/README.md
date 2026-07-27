# Contrôle parental IA

Application de contrôle parental **transparente** (non cachée) pilotée par IA —
Android d'abord, marché français d'abord.

> *Reprendre le contrôle en famille, sans ficher son enfant.*

## Contenu de ce dossier

| | |
|---|---|
| **[`SPEC.md`](SPEC.md)** | Spécification produit & architecture technique complète (14 sections). |
| **[`pitch.html`](pitch.html)** | Page de présentation lisible (vision, marché, archi, prix, roadmap). |
| **[`core/`](core/)** | Le moteur de règles — implémentation de référence, testée (`npm test`). |

## Le principe en une phrase

Un agent **visible mais inviolable** tourne sur le téléphone de l'enfant et
applique des règles que le parent définit **en parlant à une IA**, teste dans un
**mode simulation**, et affine via une **boucle d'apprentissage** — le tout
**sans collecter l'historique** de navigation de l'enfant.

## Où on en est

- [x] Cadrage : marché, différenciation, architecture, conformité, business model
- [x] Moteur de règles (référence TypeScript, 11 tests) : évaluation déterministe,
      adaptativité à l'âge, mode simulation, boucle d'apprentissage
- [ ] Backend UE (appairage, sync règles, heartbeat, IA cloud)
- [ ] App parent (chat IA + simulation + demandes d'accès)
- [ ] App enfant (agent transparent + blocage + bouton « demander »)
- [ ] Portage du moteur en Kotlin on-device

## Décisions prises

- **Robustesse** : app standard d'abord (onboarding rapide), Device Owner en V2.
- **Âge** : schéma de règles adaptatif dès le départ, focus test MVP 8–14 ans.

Voir la fin de [`SPEC.md`](SPEC.md) pour les décisions encore ouvertes.
