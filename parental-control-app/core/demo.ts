// Quick demo of what a parent sees in "simulation" mode, and the learning loop.
// Run: npm run demo   (from parental-control-app/core)

import { buildDefaultRuleSet, sampleCorpus } from "./src/defaults.ts";
import { simulate, formatSummary } from "./src/simulate.ts";
import { addApprovalRule } from "./src/learning.ts";
import type { Target } from "./src/types.ts";

const NOW = Date.parse("2026-07-01T19:30:00Z"); // Paris, Wednesday 21:30 (a school night)

console.log("=== Simulation — enfant 13-15 ans, mercredi soir 21h30 ===\n");
const rs = buildDefaultRuleSet("13-15");
const sim = simulate(rs, sampleCorpus(), NOW);
formatSummary(sim).forEach((line) => console.log("  " + line));
console.log(`\n  → ${sim.counts.allow} autorisés · ${sim.counts.block} bloqués · ${sim.counts.ask} à valider\n`);

console.log("=== Boucle d'apprentissage — l'enfant conteste, le parent autorise TikTok ===\n");
const tiktok: Target = { kind: "app", appPackage: "com.zhiliaoapp.musically", appCategory: "social", label: "TikTok" };
const updated = addApprovalRule(rs, tiktok, { kind: "always" }, "learn-tiktok-1");
const after = simulate(updated, [tiktok], NOW);
console.log("  " + formatSummary(after)[0]);
console.log("\n  → La règle est désormais dans le jeu de règles, versionnée et révocable.");
