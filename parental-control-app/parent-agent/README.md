# `parent-agent` — l'agent conversationnel (côté parent)

Le **différenciateur produit** : le parent parle en langage naturel, l'IA en fait
des règles. *« Pas de TikTok en semaine après 21h »* → une règle structurée que
le [moteur](../core/) applique.

## Le flux

```
Parent (langage naturel)
        │
        ▼
  Claude Sonnet 5  ──(structured outputs)──▶  AgentPlan { summary, operations[] }
        │
        ▼
  applyOps(ruleSet, operations)   ← pur, déterministe, auditable
        │
        ▼
  RuleSet mis à jour  →  simulation / exécution (core)
```

Le principe clé : **l'IA propose, le code déterministe dispose.** Le LLM n'émet
jamais un jeu de règles complet — seulement de petites **opérations** (`add_rule`,
`set_enabled`, `remove_rule`, `set_posture`) plus un **résumé** en français. Le
parent relit ce résumé avant que quoi que ce soit ne touche le téléphone de
l'enfant. Le LLM **ne voit jamais les données de l'enfant**, seulement les
intentions du parent.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/ruleops.ts` | Types d'opérations + `applyOps()` — le pliage pur des opérations sur un `RuleSet`. |
| `src/prompt.ts` | Le system prompt + le JSON Schema de sortie structurée (`output_config.format`). |
| `src/client.ts` | L'appel Claude Sonnet 5 réel (branché sur `@anthropic-ai/sdk` + `ANTHROPIC_API_KEY`). |
| `test/ruleops.test.ts` | 6 tests : intention simulée → opérations → règles → verdict du moteur. |

## Lancer les tests

```bash
cd parental-control-app/parent-agent
npm test   # 6/6 — aucune clé API ni dépendance requise
```

Les tests exercent la couche déterministe avec des réponses LLM **simulées**, donc
ils tournent hors-ligne. `src/client.ts` est la seule partie qui parle au réseau ;
il n'est pas importé par les tests.

## Brancher le vrai Claude

```bash
npm i @anthropic-ai/sdk
export ANTHROPIC_API_KEY=sk-ant-...
```

```ts
import { planFromIntent } from "./src/client.ts";
import { applyOps } from "./src/ruleops.ts";

const plan = await planFromIntent("pas de TikTok en semaine après 21h", ruleSet);
console.log(plan.summary);                       // à montrer au parent pour confirmation
const { ruleSet: updated } = applyOps(ruleSet, plan.operations, (i) => `parent-${Date.now()}-${i}`);
```

Choix de modèle (issu de la recherche) : **Claude Sonnet 5** avec *structured
outputs* et `effort: "low"` — la génération de règles est une extraction simple ;
on garde latence et coût bas. L'évaluation temps réel côté enfant, elle, utilise
**Claude Haiku 4.5** uniquement pour les cas ambigus (voir `SPEC.md` §5).
