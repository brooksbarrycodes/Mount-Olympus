import Fastify from "fastify";
import cors from "@fastify/cors";
import { config, llmIsLive, ttsIsLive } from "./config.ts";
import { askZeus, generateZeusOpening } from "./agents/zeus.ts";
import { analyzeNiche, runDailyReport, latestDailyReport } from "./agents/oracle.ts";
import { produceListings } from "./agents/apollo.ts";
import { listBusinesses, totals } from "./core/ledger.ts";
import { listPending, listAll, decide, autonomySnapshot, setAutonomyLevel, type AutonomyLevel } from "./core/approvals.ts";
import { guardrailState, setKill } from "./core/guardrails.ts";
import { listPredictions, predictionScore } from "./core/predictions.ts";
import { list as auditList } from "./core/auditLog.ts";
import {
  createSession,
  getSessionWithMessages,
  listSessions,
  sessionBelongsToAgent,
} from "./core/chatSessions.ts";
import { llmSpendThisMonth } from "./core/llm/anthropicLlm.ts";
import { speakOpp } from "./tools/tts.ts";
import { registerTycheRoutes } from "./tyche/routes.ts";
import { registerTreasuryRoutes } from "./treasury/routes.ts";
import { registerMissionRoutes } from "./missions/routes.ts";
import { registerDocumentRoutes } from "./documents/routes.ts";
import { registerLinearRoutes } from "./linear/routes.ts";

const ACTION_TYPES = ["etsy_listing"];
const ZEUS_AGENT = "zeus";

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
  app.get("/zeus/sessions", async () => ({
    sessions: listSessions(ZEUS_AGENT),
  }));

  app.post("/zeus/sessions", async () => {
    const session = createSession(ZEUS_AGENT);
    return { session };
  });

  app.get<{ Params: { id: string } }>("/zeus/sessions/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || !sessionBelongsToAgent(id, ZEUS_AGENT)) {
      return reply.code(404).send({ error: "session not found" });
    }
    const session = getSessionWithMessages(id);
    if (!session) return reply.code(404).send({ error: "session not found" });
    return { session };
  });

  app.post<{ Body: { sessionId?: number; message?: string } }>("/zeus/message", async (req, reply) => {
    const sessionId = Number(req.body?.sessionId);
    const message = (req.body?.message ?? "").toString();
    if (!Number.isFinite(sessionId) || !sessionBelongsToAgent(sessionId, ZEUS_AGENT)) {
      return reply.code(404).send({ error: "session not found", llmLive: llmIsLive() });
    }
    if (!message.trim()) {
      return reply.code(400).send({ error: "message required", llmLive: llmIsLive() });
    }
    try {
      const result = await askZeus(sessionId, message);
      return {
        reply: result.text,
        toolsUsed: result.toolsUsed,
        costUsd: result.costUsd,
        provider: result.provider,
        llmLive: llmIsLive(),
        sessionId,
      };
    } catch (err) {
      return reply.code(502).send({
        error: String(err),
        llmLive: llmIsLive(),
      });
    }
  });

  app.post<{ Body: { sessionId?: number } }>("/zeus/opening", async (req, reply) => {
    const sessionId = Number(req.body?.sessionId);
    if (!Number.isFinite(sessionId) || !sessionBelongsToAgent(sessionId, ZEUS_AGENT)) {
      return reply.code(404).send({ error: "session not found" });
    }
    try {
      const text = await generateZeusOpening(sessionId);
      return { text, sessionId };
    } catch (err) {
      return reply.code(502).send({ error: String(err) });
    }
  });

  app.post<{ Body: { text?: string } }>("/zeus/tts", async (req, reply) => {
    const text = (req.body?.text ?? "").toString();
    if (!text.trim()) {
      return reply.code(400).send({ error: "text required" });
    }
    try {
      const audio = await speakOpp("zeus", text);
      return reply.type("audio/mpeg").send(audio);
    } catch (err) {
      return reply.code(502).send({ error: String(err), ttsLive: ttsIsLive() });
    }
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

  app.post<{ Body: { text?: string } }>("/oracle/tts", async (req, reply) => {
    const text = (req.body?.text ?? "").toString();
    if (!text.trim()) return reply.code(400).send({ error: "text required" });
    try {
      const audio = await speakOpp("oracle", text);
      return reply.type("audio/mpeg").send(audio);
    } catch (err) {
      return reply.code(502).send({ error: String(err), ttsLive: ttsIsLive() });
    }
  });

  registerTreasuryRoutes(app);
  registerMissionRoutes(app);
  registerDocumentRoutes(app);
  registerLinearRoutes(app);
  registerTycheRoutes(app);

  return app;
}
