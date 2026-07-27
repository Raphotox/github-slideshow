# `core` — moteur de règles (implémentation de référence)

Le **cœur** du produit : la fonction pure et déterministe qui décide, pour un
site ou une app donnés à un instant donné, si l'accès est **autorisé, bloqué ou
soumis à validation** (`allow` / `block` / `ask`).

C'est la même logique qui tourne :

- **côté enfant** (exécution en temps réel, à porter en Kotlin on-device) ;
- **côté parent** (le *mode simulation* = rejouer ces règles sur un corpus) ;
- **côté serveur** (validation, versionnage).

Comme `evaluate()` est **pure** (aucune horloge, aucun aléa, `now` est passé en
argument), la simulation côté parent est un aperçu fidèle de ce qui se passera
sur le téléphone de l'enfant.

## Structure

| Fichier | Rôle |
|---|---|
| `src/types.ts` | Le modèle de règles canonique (`RuleSet`, `Rule`, `Target`, `Verdict`). |
| `src/engine.ts` | `evaluate(ruleSet, ctx)` — l'évaluateur déterministe. |
| `src/learning.ts` | La boucle d'apprentissage : `addApprovalRule()` + `buildFewShotExample()`. |
| `src/simulate.ts` | Le mode simulation : rejoue les règles sur un corpus. |
| `src/defaults.ts` | Packs de règles par défaut **adaptatifs à l'âge** + corpus d'exemples. |
| `rule-schema.json` | JSON Schema du `RuleSet` — le contrat partagé par tous les composants. |
| `test/engine.test.ts` | Suite de tests (11 cas). |
| `demo.ts` | Démo : simulation + boucle d'apprentissage. |

## Lancer

```bash
cd parental-control-app/core
npm test     # 11/11
npm run demo # aperçu simulation + apprentissage
```

Node ≥ 22.6 (utilise le *type stripping* natif, zéro dépendance).

## Concepts clés

- **Déterminisme** — `now` est un argument (`epoch ms`), jamais lu dans le moteur.
  Garantit que simulation (parent) et exécution (enfant) coïncident.
- **Priorité + spécificité** — départage des règles applicables : `priority`
  décroissante, puis spécificité (domaine/app > catégorie), puis action la plus
  restrictive. Une autorisation issue de la boucle d'apprentissage reçoit une
  priorité élevée → elle **prime** sur un blocage de catégorie.
- **Posture par défaut** — `strict` bloque l'inconnu (modèle *allowlist*),
  `balanced`/`open` l'autorisent (modèle *blocklist*).
- **Adaptativité à l'âge** — `buildDefaultRuleSet(ageBand)` génère des règles
  plus strictes pour les plus jeunes, plus légères (dialogue plutôt que blocage
  dur) pour les 16-17 ans — aligné sur la proportionnalité recommandée par la CNIL.
- **Apprentissage sans réentraînement** — approuver une demande ajoute une
  **règle explicite, versionnée, auditable et révocable** (le vrai « modèle »),
  et capture un **exemple few-shot** pour les futurs cas ambigus côté cloud.

## Portage à venir

Cette implémentation TypeScript est la **référence exécutable et testée**. Le
moteur on-device sera écrit en **Kotlin** (idéalement en Kotlin Multiplatform
pour partager la logique entre l'app Android et le backend) et devra **reproduire
exactement** ces verdicts — la suite de tests sert de spécification de conformité.
