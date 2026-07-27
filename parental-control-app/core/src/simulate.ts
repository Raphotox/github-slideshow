// The simulation mode.
//
// Because evaluate() is pure, "simulation" is just running the CURRENT rule set
// over a corpus of example targets at a chosen instant. This is exactly what the
// parent sees before activating a rule: "on your child's phone, right now, this
// is what would be blocked / allowed / asked".

import { evaluate } from "./engine.ts";
import type { RuleSet, Target, Verdict } from "./types.ts";

export interface SimResult {
  target: Target;
  verdict: Verdict;
}

export interface SimSummary {
  results: SimResult[];
  counts: { allow: number; block: number; ask: number };
}

export function simulate(ruleSet: RuleSet, corpus: Target[], now: number): SimSummary {
  const results = corpus.map((target) => ({ target, verdict: evaluate(ruleSet, { now, target }) }));
  const counts = { allow: 0, block: 0, ask: 0 };
  for (const r of results) counts[r.verdict.decision]++;
  return { results, counts };
}

/** Human-readable one-liners, for a quick parent-facing preview. */
export function formatSummary(summary: SimSummary): string[] {
  const icon = { allow: "✓", block: "✕", ask: "?" };
  return summary.results.map((r) => {
    const label = r.target.label ?? r.target.domain ?? r.target.appPackage ?? "?";
    return `${icon[r.verdict.decision]}  ${label} — ${r.verdict.reason}`;
  });
}
