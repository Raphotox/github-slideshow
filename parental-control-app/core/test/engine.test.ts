import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluate } from "../src/engine.ts";
import { addApprovalRule, buildFewShotExample } from "../src/learning.ts";
import { buildDefaultRuleSet, sampleCorpus } from "../src/defaults.ts";
import { simulate } from "../src/simulate.ts";
import type { RuleSet, Target } from "../src/types.ts";

// Fixed instants in Europe/Paris (CEST = UTC+2 in July). Jul 1 2026 is a Wednesday.
const WED_2130 = Date.parse("2026-07-01T19:30:00Z"); // Paris Wed 21:30
const WED_1500 = Date.parse("2026-07-01T13:00:00Z"); // Paris Wed 15:00
const THU_0630 = Date.parse("2026-07-02T04:30:00Z"); // Paris Thu 06:30
const THU_0800 = Date.parse("2026-07-02T06:00:00Z"); // Paris Thu 08:00

const tiktok: Target = { kind: "app", appPackage: "com.zhiliaoapp.musically", appCategory: "social", label: "TikTok" };
const porn: Target = { kind: "web", domain: "pornhub.com", categories: ["adult"], label: "Adulte" };
const unknownSite: Target = { kind: "web", domain: "some-random-blog.example", categories: [], label: "Blog inconnu" };

test("sanity: fixed instant maps to the expected Paris wall clock", () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(WED_2130));
  const wd = parts.find((p) => p.type === "weekday")!.value;
  const hh = parts.find((p) => p.type === "hour")!.value;
  const mm = parts.find((p) => p.type === "minute")!.value;
  assert.equal(wd, "Wed");
  assert.equal(`${hh}:${mm}`, "21:30");
});

test("hard blocks: adult content is blocked for every age band", () => {
  for (const band of ["8-10", "11-12", "13-15", "16-17"] as const) {
    const rs = buildDefaultRuleSet(band);
    const v = evaluate(rs, { now: WED_1500, target: porn });
    assert.equal(v.decision, "block", `age ${band}`);
    assert.equal(v.matchedRuleId, "hard-adult");
  }
});

test("default posture: strict blocks unknown, balanced allows unknown", () => {
  const strict = buildDefaultRuleSet("8-10"); // strict
  const balanced = buildDefaultRuleSet("13-15"); // balanced
  assert.equal(evaluate(strict, { now: WED_1500, target: unknownSite }).decision, "block");
  assert.equal(evaluate(balanced, { now: WED_1500, target: unknownSite }).decision, "allow");
});

test("age adaptivity: same app, different verdict by age", () => {
  assert.equal(evaluate(buildDefaultRuleSet("8-10"), { now: WED_1500, target: tiktok }).decision, "block");
  assert.equal(evaluate(buildDefaultRuleSet("11-12"), { now: WED_1500, target: tiktok }).decision, "ask");
  // 13-15: social only blocked during the school-night curfew
  assert.equal(evaluate(buildDefaultRuleSet("13-15"), { now: WED_1500, target: tiktok }).decision, "allow");
  assert.equal(evaluate(buildDefaultRuleSet("13-15"), { now: WED_2130, target: tiktok }).decision, "block");
});

test("overnight schedule: curfew wraps past midnight correctly", () => {
  const rs = buildDefaultRuleSet("13-15"); // social curfew 21:00 -> 07:00 on school nights
  assert.equal(evaluate(rs, { now: THU_0630, target: tiktok }).decision, "block"); // 06:30, still in window
  assert.equal(evaluate(rs, { now: THU_0800, target: tiktok }).decision, "allow"); // 08:00, out of window
});

test("domain matching covers subdomains", () => {
  const rs: RuleSet = {
    schemaVersion: 1, childAgeBand: "13-15", timezone: "Europe/Paris", defaultPosture: "balanced",
    rules: [{ id: "block-yt", description: "YouTube bloqué.", enabled: true, priority: 100, action: "block", match: { domains: ["youtube.com"] } }],
  };
  const sub: Target = { kind: "web", domain: "m.youtube.com", label: "YouTube mobile" };
  assert.equal(evaluate(rs, { now: WED_1500, target: sub }).decision, "block");
});

test("learning loop: parent 'always' approval overrides a broad block", () => {
  const rs = buildDefaultRuleSet("8-10"); // TikTok is hard-blocked by social-block
  const before = evaluate(rs, { now: WED_1500, target: tiktok });
  assert.equal(before.decision, "block");

  const updated = addApprovalRule(rs, tiktok, { kind: "always" }, "learn-tiktok-1");
  const after = evaluate(updated, { now: WED_1500, target: tiktok });
  assert.equal(after.decision, "allow");
  assert.equal(after.matchedRuleId, "learn-tiktok-1");

  // input rule set is untouched (pure)
  assert.equal(rs.rules.some((r) => r.id === "learn-tiktok-1"), false);
});

test("learning loop: 'once' approval does not change the rule set", () => {
  const rs = buildDefaultRuleSet("8-10");
  const updated = addApprovalRule(rs, tiktok, { kind: "once" }, "should-not-appear");
  assert.equal(updated, rs);
});

test("learning loop: few-shot example captures the correction", () => {
  const ex = buildFewShotExample(tiktok, "block", "à l'occasion d'un exposé");
  assert.equal(ex.parentDecision, "allow");
  assert.equal(ex.previousDecision, "block");
  assert.equal(ex.category, "social");
});

test("simulation: deterministic counts over the sample corpus", () => {
  const rs = buildDefaultRuleSet("13-15");
  const a = simulate(rs, sampleCorpus(), WED_2130);
  const b = simulate(rs, sampleCorpus(), WED_2130);
  // adult + gambling + tiktok(social curfew active) => 3 blocks; the rest allowed
  assert.deepEqual(a.counts, { allow: 4, block: 3, ask: 0 });
  assert.deepEqual(a.counts, b.counts); // determinism
});

test("evaluate is deterministic for identical inputs", () => {
  const rs = buildDefaultRuleSet("11-12");
  const v1 = evaluate(rs, { now: WED_2130, target: tiktok });
  const v2 = evaluate(rs, { now: WED_2130, target: tiktok });
  assert.deepEqual(v1, v2);
});
