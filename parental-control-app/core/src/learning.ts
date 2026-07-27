// The learning loop.
//
// When a child hits a block and asks ("je trouve ça injuste"), the parent can
// approve. Approving does two things, neither of which retrains a model:
//   1. addApprovalRule() — adds an explicit, high-priority, auditable rule so
//      the same request is allowed next time (the real "memory").
//   2. buildFewShotExample() — captures the (context -> decision) pair as an
//      example that can be injected into the cloud LLM prompt for *similar*
//      ambiguous cases later (learning by context, not by weights).

import type { RuleSet, Rule, Target, TimeRange, Weekday } from "./types.ts";

export type ApprovalScope =
  | { kind: "once" } // ephemeral: no rule change
  | { kind: "always" } // permanent allow for this target
  | { kind: "window"; days?: Weekday[]; timeRanges?: TimeRange[] }; // allow within a schedule

function maxPriority(ruleSet: RuleSet): number {
  return ruleSet.rules.reduce((m, r) => Math.max(m, r.priority), 0);
}

function targetMatchBlock(target: Target): Rule["match"] {
  if (target.kind === "web" && target.domain) return { domains: [target.domain] };
  if (target.kind === "app" && target.appPackage) return { apps: [target.appPackage] };
  // Fall back to category-level allow if we only know a category.
  if (target.categories && target.categories.length) return { categories: [target.categories[0]] };
  if (target.appCategory) return { appCategories: [target.appCategory] };
  return {};
}

/**
 * Returns a NEW RuleSet with an approval rule added (pure — does not mutate the
 * input). `once` returns the rule set unchanged. `id` must be supplied by the
 * caller (deterministic — the engine layer stays clock/UUID free).
 */
export function addApprovalRule(ruleSet: RuleSet, target: Target, scope: ApprovalScope, id: string): RuleSet {
  if (scope.kind === "once") return ruleSet;

  const label = target.label ?? target.domain ?? target.appPackage ?? "ce contenu";
  const rule: Rule = {
    id,
    description:
      scope.kind === "always"
        ? `Autorisé par un parent : ${label}.`
        : `Autorisé par un parent sur un créneau : ${label}.`,
    enabled: true,
    priority: maxPriority(ruleSet) + 100, // override broad blocks
    action: "allow",
    match: targetMatchBlock(target),
    schedule: scope.kind === "window" ? { days: scope.days, timeRanges: scope.timeRanges } : undefined,
    origin: "learning",
  };

  return { ...ruleSet, rules: [...ruleSet.rules, rule] };
}

export interface FewShotExample {
  targetLabel: string;
  category: string | null;
  kind: Target["kind"];
  previousDecision: "block" | "ask";
  parentDecision: "allow";
  note: string;
}

/** Capture the approval as a reusable example for future ambiguous cloud calls. */
export function buildFewShotExample(
  target: Target,
  previousDecision: "block" | "ask",
  note = "",
): FewShotExample {
  return {
    targetLabel: target.label ?? target.domain ?? target.appPackage ?? "?",
    category: (target.categories && target.categories[0]) ?? target.appCategory ?? null,
    kind: target.kind,
    previousDecision,
    parentDecision: "allow",
    note,
  };
}
