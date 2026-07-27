// Local intent → operations planner (works with no API key).
// When ANTHROPIC_API_KEY is set, server.ts calls Claude Sonnet 5 instead and
// falls back to this. Keeps the web app fully functional offline / here.

import type { AgentPlan, RuleOp } from "../parent-agent/src/ruleops.ts";

const APPS: Record<string, { pkg: string; cat: string; label: string }> = {
  tiktok: { pkg: "com.zhiliaoapp.musically", cat: "social", label: "TikTok" },
  instagram: { pkg: "com.instagram.android", cat: "social", label: "Instagram" },
  snapchat: { pkg: "com.snapchat.android", cat: "social", label: "Snapchat" },
  youtube: { pkg: "com.google.android.youtube", cat: "video", label: "YouTube" },
};

const SCHOOL_NIGHTS = ["sun", "mon", "tue", "wed", "thu"];

function findTime(t: string): string | null {
  const m = t.match(/(\d{1,2})\s*h(\s*\d{2})?/);
  if (!m) return null;
  const h = m[1].padStart(2, "0");
  const min = m[2] ? m[2].trim().padStart(2, "0") : "00";
  return `${h}:${min}`;
}

export function localPlan(intent: string): AgentPlan {
  const t = intent.toLowerCase();
  const ops: RuleOp[] = [];
  const bits: string[] = [];

  const wantsBlock = /(pas|jamais|interdi|bloqu|aucun|stop)/.test(t);
  const wantsAsk = /(demand|valid|autoris.* avant|je veux savoir)/.test(t);
  const action: "block" | "ask" | "allow" = wantsAsk && !wantsBlock ? "ask" : "block";

  const schoolNights = /(semaine|soir|école|ecole|classe)/.test(t);
  const time = findTime(t);
  const schedule =
    time || schoolNights
      ? {
          days: schoolNights ? SCHOOL_NIGHTS : undefined,
          timeRanges: time ? [{ start: time, end: "07:00" }] : undefined,
        }
      : undefined;

  // adult / porn / gambling
  if (/(porno|adulte|18\+|x\b|cul)/.test(t)) {
    ops.push({ kind: "add_rule", rule: { description: "Sites pour adultes bloqués en permanence.", action: "block", match: { categories: ["adult"] } } });
    bits.push("les sites pour adultes seront bloqués en permanence");
  }
  if (/(paris sportif|jeux d'argent|casino|betting)/.test(t)) {
    ops.push({ kind: "add_rule", rule: { description: "Jeux d'argent bloqués.", action: "block", match: { categories: ["gambling"] } } });
    bits.push("les jeux d'argent seront bloqués");
  }

  // named apps
  let matchedApp = false;
  for (const key of Object.keys(APPS)) {
    if (t.includes(key)) {
      matchedApp = true;
      const a = APPS[key];
      const when = schedule?.timeRanges ? ` après ${schedule.timeRanges[0].start}` : "";
      const days = schedule?.days ? " les soirs d'école" : "";
      ops.push({
        kind: "add_rule",
        rule: {
          description: `${a.label} — ${action === "block" ? "bloqué" : "à valider"}${days}${when}.`,
          action,
          match: { apps: [a.pkg], appCategories: [a.cat] },
          schedule,
        },
      });
      bits.push(`${a.label} sera ${action === "block" ? "bloqué" : "soumis à validation"}${days}${when}`);
    }
  }

  // generic categories if no app named
  if (!matchedApp) {
    if (/(réseau|reseau|social)/.test(t)) {
      const days = schedule?.days ? " les soirs d'école" : "";
      const when = schedule?.timeRanges ? ` après ${schedule.timeRanges[0].start}` : "";
      ops.push({ kind: "add_rule", rule: { description: `Réseaux sociaux — ${action === "block" ? "bloqués" : "à valider"}${days}${when}.`, action, match: { categories: ["social"], appCategories: ["social"] }, schedule } });
      bits.push(`les réseaux sociaux seront ${action === "block" ? "bloqués" : "à valider"}${days}${when}`);
    }
    if (/(vidéo|video|streaming)/.test(t)) {
      ops.push({ kind: "add_rule", rule: { description: `Vidéo — ${action === "block" ? "bloquée" : "à valider"}.`, action, match: { categories: ["video"], appCategories: ["video"] }, schedule } });
      bits.push(`la vidéo sera ${action === "block" ? "bloquée" : "à valider"}`);
    }
    if (/(jeu|jeux|gaming)/.test(t) && !/argent/.test(t)) {
      ops.push({ kind: "add_rule", rule: { description: `Jeux — ${action === "block" ? "bloqués" : "à valider"}.`, action, match: { categories: ["games"], appCategories: ["games"] }, schedule } });
      bits.push(`les jeux seront ${action === "block" ? "bloqués" : "à valider"}`);
    }
  }

  if (/(strict|verrouille|tout bloquer par défaut)/.test(t)) {
    ops.push({ kind: "set_posture", posture: "strict" });
    bits.push("tout ce qui n'est pas autorisé sera bloqué par défaut");
  }

  const summary =
    bits.length > 0
      ? `C'est noté : ${bits.join(" ; ")}.`
      : "Je n'ai pas bien saisi quelle règle appliquer. Essayez par ex. « pas de TikTok en semaine après 21h » ou « jamais de sites pour adultes ».";

  return { summary, operations: ops };
}
