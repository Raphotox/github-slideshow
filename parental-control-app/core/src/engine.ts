// The deterministic rule engine.
//
// evaluate() is a pure function: no I/O, no clock, no randomness. `now` is
// supplied by the caller. This is what lets the parent-side simulator and the
// child-side enforcer reach identical verdicts from the same RuleSet.

import type {
  Action,
  EvalContext,
  Posture,
  Rule,
  RuleSet,
  Schedule,
  Target,
  Verdict,
  Weekday,
} from "./types.ts";

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const ACTION_SEVERITY: Record<Action, number> = { block: 2, ask: 1, allow: 0 };

const POSTURE_FALLBACK: Record<Posture, Action> = {
  strict: "block", // allowlist model: unknown is blocked
  balanced: "allow", // blocklist model: unknown is allowed
  open: "allow",
};

function normDomain(d: string): string {
  return d.trim().toLowerCase().replace(/\.$/, "");
}

/** "example.com" matches "example.com" and any subdomain "*.example.com". */
function domainMatches(targetDomain: string, ruleDomain: string): boolean {
  const t = normDomain(targetDomain);
  const r = normDomain(ruleDomain);
  return t === r || t.endsWith("." + r);
}

function hasOverlap(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a || !b) return false;
  const set = new Set(a.map((x) => x.toLowerCase()));
  return b.some((x) => set.has(x.toLowerCase()));
}

/** Zoned weekday + minutes-of-day for an instant, via Intl (deterministic given now+tz). */
function zonedParts(now: number, timezone: string): { weekday: Weekday; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(now));
  let hh = 0;
  let mm = 0;
  let wd: Weekday = "mon";
  for (const p of parts) {
    if (p.type === "hour") hh = parseInt(p.value, 10) % 24;
    else if (p.type === "minute") mm = parseInt(p.value, 10);
    else if (p.type === "weekday") {
      const map: Record<string, Weekday> = {
        Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat",
      };
      wd = map[p.value] ?? "mon";
    }
  }
  return { weekday: wd, minutes: hh * 60 + mm };
}

function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  return (h % 24) * 60 + (m || 0);
}

function timeInRange(minutes: number, start: string, end: string): boolean {
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  if (s === e) return true; // degenerate range = whole day
  if (s < e) return minutes >= s && minutes < e; // same-day window
  return minutes >= s || minutes < e; // overnight window (e.g. 21:00 -> 07:00)
}

function scheduleActive(schedule: Schedule | undefined, now: number, timezone: string): boolean {
  if (!schedule) return true;
  const { weekday, minutes } = zonedParts(now, timezone);
  if (schedule.days && schedule.days.length > 0 && !schedule.days.includes(weekday)) {
    return false;
  }
  if (schedule.timeRanges && schedule.timeRanges.length > 0) {
    return schedule.timeRanges.some((r) => timeInRange(minutes, r.start, r.end));
  }
  return true;
}

/** Does a rule's match block apply to this target? Returns a specificity score, or 0 if no match. */
function matchSpecificity(rule: Rule, target: Target): number {
  const m = rule.match;
  let score = 0;
  if (target.kind === "web") {
    if (target.domain && m.domains && m.domains.some((d) => domainMatches(target.domain!, d))) {
      score = Math.max(score, 2); // exact/subdomain = specific
    }
    if (hasOverlap(m.categories, target.categories)) score = Math.max(score, 1);
  } else {
    if (target.appPackage && m.apps && m.apps.map((a) => a.toLowerCase()).includes(target.appPackage.toLowerCase())) {
      score = Math.max(score, 2);
    }
    if (m.appCategories && target.appCategory && m.appCategories.map((c) => c.toLowerCase()).includes(target.appCategory.toLowerCase())) {
      score = Math.max(score, 1);
    }
  }
  return score;
}

function bestCategory(target: Target): string | null {
  if (target.categories && target.categories.length > 0) return target.categories[0];
  if (target.appCategory) return target.appCategory;
  return null;
}

/**
 * Evaluate a target against a rule set. Deterministic and side-effect free.
 * Tie-breaking among applicable rules: priority desc, then specificity desc,
 * then most-restrictive action, then id asc — so a high-priority learning-loop
 * "allow" for a specific domain overrides a broad category "block".
 */
export function evaluate(ruleSet: RuleSet, ctx: EvalContext): Verdict {
  const { now, target } = ctx;
  const category = bestCategory(target);

  const applicable = ruleSet.rules
    .filter((r) => r.enabled)
    .map((r) => ({ rule: r, spec: matchSpecificity(r, target) }))
    .filter((x) => x.spec > 0 && scheduleActive(x.rule.schedule, now, ruleSet.timezone));

  if (applicable.length === 0) {
    const decision = POSTURE_FALLBACK[ruleSet.defaultPosture];
    return {
      decision,
      reason:
        decision === "block"
          ? "Bloqué par défaut : aucune règle n'autorise ce contenu (posture stricte)."
          : "Autorisé par défaut : aucune règle ne s'y oppose.",
      matchedRuleId: null,
      category,
      source: "default",
    };
  }

  applicable.sort((a, b) => {
    if (b.rule.priority !== a.rule.priority) return b.rule.priority - a.rule.priority;
    if (b.spec !== a.spec) return b.spec - a.spec;
    const sev = ACTION_SEVERITY[b.rule.action] - ACTION_SEVERITY[a.rule.action];
    if (sev !== 0) return sev;
    return a.rule.id < b.rule.id ? -1 : 1;
  });

  const winner = applicable[0].rule;
  return {
    decision: winner.action,
    reason: winner.description,
    matchedRuleId: winner.id,
    category,
    source: "rule",
  };
}
