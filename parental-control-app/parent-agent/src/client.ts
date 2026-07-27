// Live Claude client for the parent agent.
//
// Uses Claude Sonnet 5 with structured outputs to turn a parent's intention into
// a validated AgentPlan. This is the only file that talks to the network; the
// deterministic layer (ruleops.ts) and its tests do not depend on it, so the
// test suite runs with no SDK and no API key.
//
// Requires: npm i @anthropic-ai/sdk  +  ANTHROPIC_API_KEY in the environment.

import Anthropic from "@anthropic-ai/sdk";
import type { RuleSet } from "../../core/src/types.ts";
import type { AgentPlan } from "./ruleops.ts";
import { SYSTEM_PROMPT, PLAN_SCHEMA } from "./prompt.ts";

const MODEL = "claude-sonnet-5"; // research choice: cheap, fast, structured-output capable

const client = new Anthropic(); // reads ANTHROPIC_API_KEY (or an `ant` profile)

/** Compact, id-bearing view of the current rules so the agent can reference them. */
function rulesContext(ruleSet: RuleSet): string {
  const lines = ruleSet.rules.map(
    (r) => `- id=${r.id} [${r.enabled ? "on" : "off"}] ${r.action}: ${r.description}`,
  );
  return `Âge de l'enfant : ${ruleSet.childAgeBand}. Posture par défaut : ${ruleSet.defaultPosture}.\nRègles actuelles :\n${lines.join("\n") || "(aucune)"}`;
}

/**
 * Turn a parent's natural-language request into a structured AgentPlan.
 * The caller then reviews it and applies it with applyOps().
 */
export async function planFromIntent(intent: string, ruleSet: RuleSet): Promise<AgentPlan> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: "low", // simple extraction; keeps latency and cost down
      format: { type: "json_schema", schema: PLAN_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `${rulesContext(ruleSet)}\n\nDemande du parent : « ${intent} »`,
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    throw new Error("La demande a été refusée par les garde-fous du modèle.");
  }

  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("Réponse du modèle vide ou inattendue.");
  }

  return JSON.parse(text.text) as AgentPlan;
}
