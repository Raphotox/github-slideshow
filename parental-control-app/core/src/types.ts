// Canonical rule model for the parental-control engine.
//
// This is the single source of truth for "what a rule is" and is mirrored by
// the on-device Kotlin engine (child app) and the backend. The evaluator
// (engine.ts) is a PURE, DETERMINISTIC function of (RuleSet, EvalContext):
// the same inputs always produce the same verdict, which is what makes the
// parent-side "simulation" mode a faithful preview of on-device behaviour.

export type Action = "allow" | "block" | "ask";
export type Posture = "strict" | "balanced" | "open";
export type AgeBand = "8-10" | "11-12" | "13-15" | "16-17";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type TargetKind = "web" | "app";
export type Origin = "default" | "parent" | "learning";

/** A local time window. When start > end the range spans midnight (e.g. 21:00 -> 07:00). */
export interface TimeRange {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface Schedule {
  days?: Weekday[]; // omitted => every day
  timeRanges?: TimeRange[]; // omitted => all day
}

/**
 * A rule matches a target if ANY specified criterion matches (OR within a
 * rule). Web targets are tested against `domains`/`categories`; app targets
 * against `apps`/`appCategories`.
 */
export interface Match {
  categories?: string[]; // content categories e.g. "adult", "social", "video"
  domains?: string[]; // "example.com" also matches "*.example.com"
  apps?: string[]; // Android package names, e.g. "com.zhiliaoapp.musically"
  appCategories?: string[];
}

export interface Rule {
  id: string;
  description: string; // human-readable summary (what the parent asked / the IA restated)
  enabled: boolean;
  priority: number; // higher wins; learning-loop overrides use high values
  action: Action;
  match: Match;
  schedule?: Schedule;
  origin?: Origin; // provenance, for audit and the learning loop
}

export interface RuleSet {
  schemaVersion: number;
  childAgeBand: AgeBand;
  timezone: string; // IANA tz, e.g. "Europe/Paris"
  defaultPosture: Posture; // fallback when no rule matches
  rules: Rule[];
}

export interface Target {
  kind: TargetKind;
  domain?: string;
  appPackage?: string;
  categories?: string[]; // categories known/derived for this target
  appCategory?: string;
  label?: string; // human label, used in messages and simulation output
}

export interface EvalContext {
  now: number; // epoch ms — PASSED IN. The engine never reads the clock itself.
  target: Target;
}

export interface Verdict {
  decision: Action;
  reason: string; // plain-language explanation (child message + parent audit)
  matchedRuleId: string | null;
  category: string | null;
  source: "rule" | "default";
}
