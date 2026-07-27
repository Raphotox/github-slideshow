// Age-adaptive default rule packs.
//
// When a parent onboards, the IA (Claude Sonnet, server side) turns their
// answers into a RuleSet. Before that, we ship a sensible default per age band
// so the product is useful on first launch. Stricter for younger children,
// lighter (more dialogue, fewer hard blocks) for older teens — mirroring the
// CNIL guidance on proportionality by age.

import type { AgeBand, Rule, RuleSet } from "./types.ts";

// Always-blocked categories, regardless of age (adult / gambling / graphic violence).
function hardBlocks(): Rule[] {
  return [
    {
      id: "hard-adult",
      description: "Contenu pour adultes bloqué en permanence.",
      enabled: true,
      priority: 1000,
      action: "block",
      match: { categories: ["adult"] },
      origin: "default",
    },
    {
      id: "hard-gambling",
      description: "Jeux d'argent bloqués en permanence.",
      enabled: true,
      priority: 1000,
      action: "block",
      match: { categories: ["gambling"] },
      origin: "default",
    },
    {
      id: "hard-violence",
      description: "Contenu violent explicite bloqué en permanence.",
      enabled: true,
      priority: 1000,
      action: "block",
      match: { categories: ["violence-graphic"] },
      origin: "default",
    },
  ];
}

const SCHOOL_NIGHTS = ["sun", "mon", "tue", "wed", "thu"] as const;

export function buildDefaultRuleSet(ageBand: AgeBand, timezone = "Europe/Paris"): RuleSet {
  const rules: Rule[] = [...hardBlocks()];

  if (ageBand === "8-10") {
    rules.push(
      {
        id: "social-block",
        description: "Réseaux sociaux non autorisés à cet âge.",
        enabled: true,
        priority: 500,
        action: "block",
        match: { categories: ["social"], appCategories: ["social"] },
        origin: "default",
      },
      {
        id: "video-ask",
        description: "Les vidéos demandent une validation.",
        enabled: true,
        priority: 300,
        action: "ask",
        match: { categories: ["video"], appCategories: ["video"] },
        origin: "default",
      },
    );
  } else if (ageBand === "11-12") {
    rules.push(
      {
        id: "social-ask",
        description: "Réseaux sociaux : une validation est demandée.",
        enabled: true,
        priority: 500,
        action: "ask",
        match: { categories: ["social"], appCategories: ["social"] },
        origin: "default",
      },
      {
        id: "video-curfew",
        description: "Pas de vidéo les soirs d'école après 21h00.",
        enabled: true,
        priority: 300,
        action: "block",
        match: { categories: ["video"], appCategories: ["video"] },
        schedule: { days: [...SCHOOL_NIGHTS], timeRanges: [{ start: "21:00", end: "07:00" }] },
        origin: "default",
      },
    );
  } else if (ageBand === "13-15") {
    rules.push(
      {
        id: "social-curfew",
        description: "Réseaux sociaux en pause les soirs d'école après 21h00.",
        enabled: true,
        priority: 500,
        action: "block",
        match: { categories: ["social"], appCategories: ["social"] },
        schedule: { days: [...SCHOOL_NIGHTS], timeRanges: [{ start: "21:00", end: "07:00" }] },
        origin: "default",
      },
      {
        id: "video-curfew",
        description: "Vidéo en pause les soirs d'école après 22h00.",
        enabled: true,
        priority: 300,
        action: "block",
        match: { categories: ["video"], appCategories: ["video"] },
        schedule: { days: [...SCHOOL_NIGHTS], timeRanges: [{ start: "22:00", end: "07:00" }] },
        origin: "default",
      },
    );
  } else {
    // 16-17: lightest touch — only the hard blocks + a gentle late-night curfew.
    rules.push({
      id: "night-curfew",
      description: "Écrans en pause la nuit (00h00–06h00).",
      enabled: true,
      priority: 200,
      action: "block",
      match: { categories: ["social", "video", "games"], appCategories: ["social", "video", "games"] },
      schedule: { timeRanges: [{ start: "00:00", end: "06:00" }] },
      origin: "default",
    });
  }

  return {
    schemaVersion: 1,
    childAgeBand: ageBand,
    timezone,
    defaultPosture: ageBand === "8-10" ? "strict" : "balanced",
    rules,
  };
}

/** A small labelled corpus for the simulation preview / tests. */
export function sampleCorpus() {
  return [
    { kind: "web" as const, domain: "pornhub.com", categories: ["adult"], label: "Site pour adultes" },
    { kind: "web" as const, domain: "wikipedia.org", categories: ["education"], label: "Wikipédia" },
    { kind: "web" as const, domain: "youtube.com", categories: ["video"], label: "YouTube (web)" },
    { kind: "web" as const, domain: "winamax.fr", categories: ["gambling"], label: "Paris sportifs" },
    { kind: "app" as const, appPackage: "com.zhiliaoapp.musically", appCategory: "social", label: "TikTok" },
    { kind: "app" as const, appPackage: "com.google.android.youtube", appCategory: "video", label: "YouTube (app)" },
    { kind: "app" as const, appPackage: "com.duolingo", appCategory: "education", label: "Duolingo" },
  ];
}
