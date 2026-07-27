// System prompt and structured-output schema for the parent-side agent.
//
// The agent turns a parent's natural-language intention ("pas de TikTok en
// semaine après 21h") into a validated AgentPlan (summary + operations). It is
// deliberately constrained: it proposes changes, it never sees the child's data.

export const SYSTEM_PROMPT = `Tu es l'assistant d'une application de contrôle parental française, transparente et respectueuse de la vie privée.

Ton rôle : transformer ce que le parent te dit en langage naturel en RÈGLES structurées, claires et proportionnées. Tu ne vois jamais l'historique de navigation de l'enfant — tu ne travailles que sur les intentions du parent.

Tu réponds UNIQUEMENT via le format structuré demandé : un résumé en français simple ("summary") + une liste d'opérations ("operations").

Principes :
- Traduis l'intention en une ou plusieurs opérations. Préfère peu de règles claires.
- Les catégories de contenu utiles : "adult", "gambling", "violence-graphic", "social", "video", "games", "education", "messaging", "shopping".
- Une action vaut : "allow" (autoriser), "block" (bloquer), "ask" (demander une validation au parent).
- Pour un horaire, utilise "schedule" avec "days" (mon..sun) et/ou "timeRanges" ({start,end} en "HH:MM", start>end = passe minuit). "Soirs d'école" = ["sun","mon","tue","wed","thu"].
- Cible les apps par "apps" (nom de package si connu, ex "com.zhiliaoapp.musically" pour TikTok) ou "appCategories" ; le web par "domains" ou "categories".
- Reste proportionné à l'âge : pour un ado, préfère "ask" (dialogue) plutôt qu'un blocage sec quand c'est raisonnable.
- Le "summary" explique au parent, en une ou deux phrases, ce qui va changer et pourquoi.
- N'invente pas de règles non demandées. Si la demande est ambiguë, propose l'interprétation la plus prudente et signale-le dans le summary.`;

// JSON Schema for structured outputs (output_config.format). Kept within the
// documented structured-output limits: additionalProperties:false everywhere,
// discriminated union via a "kind" const, no unsupported numeric/length bounds.
export const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "operations"],
  properties: {
    summary: { type: "string" },
    operations: {
      type: "array",
      items: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["kind", "rule"],
            properties: {
              kind: { const: "add_rule" },
              rule: {
                type: "object",
                additionalProperties: false,
                required: ["description", "action", "match"],
                properties: {
                  description: { type: "string" },
                  action: { type: "string", enum: ["allow", "block", "ask"] },
                  match: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      categories: { type: "array", items: { type: "string" } },
                      domains: { type: "array", items: { type: "string" } },
                      apps: { type: "array", items: { type: "string" } },
                      appCategories: { type: "array", items: { type: "string" } },
                    },
                  },
                  schedule: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      days: {
                        type: "array",
                        items: { type: "string", enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
                      },
                      timeRanges: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          required: ["start", "end"],
                          properties: { start: { type: "string" }, end: { type: "string" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["kind", "id", "enabled"],
            properties: {
              kind: { const: "set_enabled" },
              id: { type: "string" },
              enabled: { type: "boolean" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["kind", "id"],
            properties: {
              kind: { const: "remove_rule" },
              id: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["kind", "posture"],
            properties: {
              kind: { const: "set_posture" },
              posture: { type: "string", enum: ["strict", "balanced", "open"] },
            },
          },
        ],
      },
    },
  },
} as const;
