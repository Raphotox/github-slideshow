// A real, runnable parent-side web app. Zero dependencies (node built-ins only).
//   node --experimental-strip-types server.ts   → http://localhost:3000
//
// It uses the SAME tested logic as the rest of the project: the deterministic
// engine (core/) for simulation and applyOps (parent-agent/) for changes. The
// intent → rules step uses a local planner by default, or Claude Sonnet 5 when
// ANTHROPIC_API_KEY is set.

import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { buildDefaultRuleSet, sampleCorpus } from "../core/src/defaults.ts";
import { simulate } from "../core/src/simulate.ts";
import { applyOps } from "../parent-agent/src/ruleops.ts";
import type { RuleSet } from "../core/src/types.ts";
import type { AgentPlan } from "../parent-agent/src/ruleops.ts";
import { localPlan } from "./planner.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

let idCounter = 0;
const nextId = () => `p-${++idCounter}`;

async function readBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}

function json(res: http.ServerResponse, code: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

// Intent → plan. Uses Claude if a key is present, else the local planner.
async function makePlan(intent: string, ruleSet: RuleSet): Promise<{ plan: AgentPlan; via: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { plan: localPlan(intent), via: "local" };
  try {
    const { planFromIntent } = await import("../parent-agent/src/client.ts");
    return { plan: await planFromIntent(intent, ruleSet), via: "claude-sonnet-5" };
  } catch {
    return { plan: localPlan(intent), via: "local (Claude indisponible)" };
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (req.method === "GET" && url.pathname === "/") {
      const html = await readFile(join(HERE, "public", "index.html"), "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    if (req.method === "GET" && url.pathname === "/api/init") {
      const age = (url.searchParams.get("age") as any) || "13-15";
      return json(res, 200, { ruleSet: buildDefaultRuleSet(age) });
    }

    if (req.method === "POST" && url.pathname === "/api/plan") {
      const { intent, ruleSet } = await readBody(req);
      const { plan, via } = await makePlan(String(intent || ""), ruleSet as RuleSet);
      const result = applyOps(ruleSet as RuleSet, plan.operations, nextId);
      const sim = simulate(result.ruleSet, sampleCorpus(), Date.now());
      return json(res, 200, { plan, via, result, simulation: sim });
    }

    if (req.method === "POST" && url.pathname === "/api/simulate") {
      const { ruleSet } = await readBody(req);
      return json(res, 200, { simulation: simulate(ruleSet as RuleSet, sampleCorpus(), Date.now()) });
    }

    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: String((e as Error).message) });
  }
});

server.listen(PORT, () => console.log(`Balise parent app → http://localhost:${PORT}`));
