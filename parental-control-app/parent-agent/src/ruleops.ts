// Rule operations — the bridge between the conversational agent and the engine.
//
// The parent agent (Claude Sonnet) never emits a whole RuleSet. It emits a list
// of small, auditable OPERATIONS plus a plain-language summary. applyOps() is a
// pure function that folds those operations onto the current RuleSet — so the
// LLM proposes, deterministic code disposes, and every change is reviewable
// before it reaches a child's phone.

import type { Action, Posture, RuleSet, Rule, Schedule } from "../../core/src/types.ts";

/** What the LLM is allowed to specify for a new rule (the engine fills the rest). */
export interface RuleDraft {
  description: string;
  action: Action;
  match: {
    categories?: string[];
    domains?: string[];
    apps?: string[];
    appCategories?: string[];
  };
  schedule?: Schedule;
}

export type RuleOp =
  | { kind: "add_rule"; rule: RuleDraft }
  | { kind: "set_enabled"; id: string; enabled: boolean }
  | { kind: "remove_rule"; id: string }
  | { kind: "set_posture"; posture: Posture };

/** The full structured payload the LLM returns. */
export interface AgentPlan {
  summary: string; // plain-language restatement for the confirmation UI
  operations: RuleOp[];
}

export interface ApplyResult {
  ruleSet: RuleSet;
  applied: string[]; // human-readable log of what changed
  warnings: string[]; // non-fatal problems (e.g. unknown rule id)
}

/**
 * Fold a list of operations onto a rule set. Pure: returns a new RuleSet, never
 * mutates the input. `nextId` supplies deterministic IDs for added rules (the
 * caller owns ID generation so the engine layer stays clock/UUID free).
 */
export function applyOps(base: RuleSet, ops: RuleOp[], nextId: (i: number) => string): ApplyResult {
  let rules: Rule[] = base.rules.map((r) => ({ ...r }));
  let posture = base.defaultPosture;
  const applied: string[] = [];
  const warnings: string[] = [];

  const maxPriority = () => rules.reduce((m, r) => Math.max(m, r.priority), 0);

  ops.forEach((op, i) => {
    switch (op.kind) {
      case "add_rule": {
        const draft = op.rule;
        if (!hasAnyMatcher(draft.match)) {
          warnings.push(`Règle ignorée (aucun critère de ciblage) : « ${draft.description} ».`);
          return;
        }
        const rule: Rule = {
          id: nextId(i),
          description: draft.description,
          enabled: true,
          priority: maxPriority() + 10,
          action: draft.action,
          match: { ...draft.match },
          schedule: draft.schedule,
          origin: "parent",
        };
        rules.push(rule);
        applied.push(`Ajout : ${describeRule(rule)}`);
        break;
      }
      case "set_enabled": {
        const rule = rules.find((r) => r.id === op.id);
        if (!rule) {
          warnings.push(`Impossible d'activer/désactiver une règle inconnue (id « ${op.id} »).`);
          return;
        }
        rule.enabled = op.enabled;
        applied.push(`${op.enabled ? "Activé" : "Désactivé"} : ${rule.description}`);
        break;
      }
      case "remove_rule": {
        const before = rules.length;
        const removed = rules.find((r) => r.id === op.id);
        rules = rules.filter((r) => r.id !== op.id);
        if (rules.length === before) warnings.push(`Aucune règle à supprimer (id « ${op.id} »).`);
        else applied.push(`Supprimé : ${removed?.description ?? op.id}`);
        break;
      }
      case "set_posture": {
        posture = op.posture;
        applied.push(`Posture par défaut : ${op.posture}`);
        break;
      }
    }
  });

  return { ruleSet: { ...base, defaultPosture: posture, rules }, applied, warnings };
}

function hasAnyMatcher(m: RuleDraft["match"]): boolean {
  return Boolean(
    (m.categories && m.categories.length) ||
      (m.domains && m.domains.length) ||
      (m.apps && m.apps.length) ||
      (m.appCategories && m.appCategories.length),
  );
}

function describeRule(rule: Rule): string {
  const target =
    rule.match.apps?.join(", ") ??
    rule.match.appCategories?.join(", ") ??
    rule.match.domains?.join(", ") ??
    rule.match.categories?.join(", ") ??
    "?";
  const when = rule.schedule?.timeRanges?.length
    ? ` (${rule.schedule.timeRanges.map((t) => `${t.start}-${t.end}`).join(", ")})`
    : "";
  return `${rule.action} → ${target}${when}`;
}
