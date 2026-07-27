import { test } from "node:test";
import assert from "node:assert/strict";

import { applyOps } from "../src/ruleops.ts";
import type { AgentPlan } from "../src/ruleops.ts";
import { buildDefaultRuleSet } from "../../core/src/defaults.ts";
import { evaluate } from "../../core/src/engine.ts";
import type { Target } from "../../core/src/types.ts";

const nextId = (i: number) => `parent-${i}`;

const WED_2130 = Date.parse("2026-07-01T19:30:00Z"); // Paris Wed 21:30
const WED_1500 = Date.parse("2026-07-01T13:00:00Z"); // Paris Wed 15:00

const tiktok: Target = { kind: "app", appPackage: "com.zhiliaoapp.musically", appCategory: "social", label: "TikTok" };
const unknownSite: Target = { kind: "web", domain: "random.example", categories: [], label: "Site inconnu" };

test("end-to-end: a parent intent becomes a rule that the engine enforces", () => {
  // What Claude Sonnet would return for "pas de réseaux sociaux les soirs d'école après 21h"
  const plan: AgentPlan = {
    summary: "Les réseaux sociaux seront bloqués les soirs d'école, de 21h à 7h.",
    operations: [
      {
        kind: "add_rule",
        rule: {
          description: "Réseaux sociaux en pause les soirs d'école après 21h.",
          action: "block",
          match: { appCategories: ["social"], categories: ["social"] },
          schedule: { days: ["sun", "mon", "tue", "wed", "thu"], timeRanges: [{ start: "21:00", end: "07:00" }] },
        },
      },
    ],
  };

  const base = buildDefaultRuleSet("16-17"); // light defaults, no daytime social rule
  assert.equal(evaluate(base, { now: WED_2130, target: tiktok }).decision, "allow"); // before

  const { ruleSet, applied, warnings } = applyOps(base, plan.operations, nextId);
  assert.equal(warnings.length, 0);
  assert.equal(applied.length, 1);

  assert.equal(evaluate(ruleSet, { now: WED_2130, target: tiktok }).decision, "block"); // curfew active
  assert.equal(evaluate(ruleSet, { now: WED_1500, target: tiktok }).decision, "allow"); // outside curfew
});

test("applyOps is pure — the base rule set is untouched", () => {
  const base = buildDefaultRuleSet("13-15");
  const beforeCount = base.rules.length;
  applyOps(base, [{ kind: "add_rule", rule: { description: "x", action: "block", match: { categories: ["shopping"] } } }], nextId);
  assert.equal(base.rules.length, beforeCount);
});

test("set_posture strict makes unknown sites blocked", () => {
  const base = buildDefaultRuleSet("13-15"); // balanced by default → unknown allowed
  assert.equal(evaluate(base, { now: WED_1500, target: unknownSite }).decision, "allow");

  const { ruleSet } = applyOps(base, [{ kind: "set_posture", posture: "strict" }], nextId);
  assert.equal(evaluate(ruleSet, { now: WED_1500, target: unknownSite }).decision, "block");
});

test("set_enabled disables an existing rule", () => {
  const base = buildDefaultRuleSet("11-12"); // balanced posture, has social-ask
  assert.equal(evaluate(base, { now: WED_1500, target: tiktok }).decision, "ask");

  const { ruleSet, applied } = applyOps(base, [{ kind: "set_enabled", id: "social-ask", enabled: false }], nextId);
  assert.match(applied[0], /Désactivé/);
  // no social rule left, balanced posture → allowed
  assert.equal(evaluate(ruleSet, { now: WED_1500, target: tiktok }).decision, "allow");
});

test("unknown ids and empty matchers produce warnings, not crashes", () => {
  const base = buildDefaultRuleSet("13-15");
  const { warnings } = applyOps(
    base,
    [
      { kind: "set_enabled", id: "does-not-exist", enabled: false },
      { kind: "remove_rule", id: "also-missing" },
      { kind: "add_rule", rule: { description: "règle vide", action: "block", match: {} } },
    ],
    nextId,
  );
  assert.equal(warnings.length, 3);
});

test("remove_rule drops a rule by id", () => {
  const base = buildDefaultRuleSet("8-10");
  const { ruleSet, applied } = applyOps(base, [{ kind: "remove_rule", id: "hard-adult" }], nextId);
  assert.match(applied[0], /Supprimé/);
  assert.equal(ruleSet.rules.some((r) => r.id === "hard-adult"), false);
});
