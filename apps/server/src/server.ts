import Fastify from "fastify";
import cors from "@fastify/cors";
import { config, llmIsLive } from "./config.ts";
import { askZeus } from "./agents/zeus.ts";
import { analyzeNiche, runDailyReport, latestDailyReport } from "./agents/oracle.ts";
import { produceListings } from "./agents/apollo.ts";
import { listBusinesses, totals } from "./core/ledger.ts";
import { listPending, listAll, decide, autonomySnapshot, setAutonomyLevel, type AutonomyLevel } from "./core/approvals.ts";
import { guardrailState, setKill } from "./core/guardrails.ts";
import { listPredictions, predictionScore } from "./core/predictions.ts";
import { list as auditList } from "./core/auditLog.ts";
import { llmSpendThisMonth } from "./core/llm/anthropicLlm.ts";

const ACTION_TYPES = ["etsy_listing"];

export function buildServer() {
  const app = Fastify({ logger: false });
  app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true, adapterMode: config.adapterMode, llmLive: llmIsLive() }));

  app.get("/state", async () => ({
    adapterMode: config.adapterMode,
    llmLive: llmIsLive(),
    guardrails: guardrailState(),
    autonomy: autonomySnapshot(ACTION_TYPES),
    totals: totals(),
    llm: { spendThisMonth: llmSpendThisMonth(), monthlyBudgetUsd: config.llmMonthlyBudgetUsd },
  }));

  // --- Zeus ---------------------------------------------------------------
  app.post<{ Body: { message?: string } }>("/zeus/message", async (req) => {
    const message = (req.body?.message ?? "").toString();
    const result = await askZeus(message);
    return { reply: result.text, toolsUsed: result.toolsUsed, costUsd: result.costUsd };
  });

  // --- Oracle -------------------------------------------------------------
  app.post<{ Body: { question?: string } }>("/oracle/analyze", async (req) => {
    const question = (req.body?.question ?? "").toString();
    const result = await analyzeNiche(question);
    return { report: result.text, toolsUsed: result.toolsUsed, costUsd: result.costUsd };
  });

  app.get("/oracle/report", async () => {
    const existing = latestDailyReport();
    if (existing) return { report: existing.content, generatedAt: existing.created_at, fresh: false };
    const result = await runDailyReport();
    return { report: result.text, generatedAt: new Date().toISOString(), fresh: true };
  });

  app.post("/oracle/daily", async () => {
    const result = await runDailyReport();
    return { report: result.text, toolsUsed: result.toolsUsed };
  });

  app.get("/oracle/predictions", async () => ({
    predictions: listPredictions("oracle"),
    score: predictionScore("oracle"),
  }));

  // --- Apollo -------------------------------------------------------------
  app.post<{ Body: { niche?: string } }>("/apollo/produce", async (req) => {
    const niche = req.body?.niche ? String(req.body.niche) : undefined;
    const result = await produceListings(niche);
    return { result: result.text, toolsUsed: result.toolsUsed };
  });

  // --- Ledger / dashboard -------------------------------------------------
  app.get("/ledger", async () => ({ businesses: listBusinesses(), totals: totals() }));

  app.get("/audit", async () => ({ entries: auditList(50) }));

  // --- Approvals ----------------------------------------------------------
  app.get<{ Querystring: { all?: string } }>("/approvals", async (req) => ({
    approvals: req.query?.all ? listAll() : listPending(),
  }));

  app.post<{ Params: { id: string } }>("/approvals/:id/approve", async (req, reply) => {
    const res = decide(Number(req.params.id), "approved", "archon");
    if (!res.ok) return reply.code(409).send(res);
    return res;
  });

  app.post<{ Params: { id: string } }>("/approvals/:id/reject", async (req, reply) => {
    const res = decide(Number(req.params.id), "rejected", "archon");
    if (!res.ok) return reply.code(409).send(res);
    return res;
  });

  app.post<{ Body: { actionType?: string; level?: number } }>("/autonomy", async (req) => {
    const actionType = String(req.body?.actionType ?? "etsy_listing");
    const level = Number(req.body?.level ?? 1) as AutonomyLevel;
    setAutonomyLevel(actionType, level);
    return { ok: true, autonomy: autonomySnapshot(ACTION_TYPES) };
  });

  // --- Kill switch --------------------------------------------------------
  app.post<{ Body: { on?: boolean } }>("/kill", async (req) => {
    const on = Boolean(req.body?.on);
    setKill(on);
    return { ok: true, killSwitch: on };
  });

  return app;
}
