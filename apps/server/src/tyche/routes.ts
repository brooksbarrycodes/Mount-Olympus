import type { FastifyInstance } from "fastify";
import { type TycheMode, type TycheStrategy } from "../config.ts";
import {
  getTycheStatus,
  runScan,
  setRuntimeMode,
  setRuntimeStrategy,
  startTycheLoop,
  stopTycheLoop,
  maybeScanForServerless,
} from "./tycheLoop.ts";
import {
  listTrades,
  getTrade,
  latestBalances,
  todayPnlUsd,
  listSystemEvents,
  listRiskDecisions,
} from "./storage/repositories.ts";
import { setTychePaused, isTychePaused } from "./risk/killSwitch.ts";
import { onTradeEvent, onSystemEvent } from "./execution/executor.ts";
import type { TradeBundle } from "./models/tradeBundle.ts";
import { runPreflight, blockLiveMode } from "./preflight.ts";
import {
  getSessionStatus,
  startSandboxSession,
  stopSandboxSession,
} from "./session/sessionManager.ts";
import { getWatchdogState, startZeusWatchdog, stopZeusWatchdog } from "./watchdog/zeusWatchdog.ts";
import { initTycheSchema } from "./storage/schema.ts";

const LIVE_CONFIRM = "ENABLE TYCHE LIVE";

export function registerTycheRoutes(app: FastifyInstance): void {
  initTycheSchema();

  app.get("/tyche/health", async () => {
    await maybeScanForServerless();
    const s = getTycheStatus();
    return {
      ok: true,
      mode: s.mode,
      venueHealth: s.venueHealth,
      lastScanAt: s.lastScanAt,
      session: s.session,
    };
  });

  app.get("/tyche/preflight", async () => {
    await maybeScanForServerless();
    return runPreflight();
  });

  app.get("/tyche/session", async () => ({
    ...getSessionStatus(),
    watchdog: getWatchdogState(),
  }));

  app.post("/tyche/session/start", async (_req, reply) => {
    const result = await startSandboxSession();
    if (!result.ok) return reply.code(400).send(result);
    startTycheLoop();
    startZeusWatchdog();
    await runScan();
    return { ok: true, sessionId: result.sessionId, status: getSessionStatus() };
  });

  app.post<{ Body: { reason?: string } }>("/tyche/session/stop", async (req) => {
    const reason = String(req.body?.reason ?? "manual_stop");
    const result = await stopSandboxSession(reason);
    stopTycheLoop();
    stopZeusWatchdog();
    return { ...result, status: getSessionStatus() };
  });

  app.get<{ Querystring: { limit?: string } }>("/tyche/events", async (req) => {
    const limit = Number(req.query?.limit ?? 200);
    return {
      events: listSystemEvents(limit),
      riskDecisions: listRiskDecisions(Math.min(limit, 100)),
    };
  });

  app.get("/tyche/status", async () => {
    await maybeScanForServerless();
    const s = getTycheStatus();
    return {
      ...s,
      todayPnlUsd: todayPnlUsd(),
      paused: isTychePaused(),
      session: getSessionStatus(),
      watchdog: getWatchdogState(),
    };
  });

  app.get("/tyche/opportunities", async () => ({
    opportunities: getTycheStatus().opportunities,
  }));

  app.get<{ Querystring: { limit?: string } }>("/tyche/trades", async (req) => ({
    trades: listTrades(Number(req.query?.limit ?? 50)),
  }));

  app.get<{ Params: { id: string } }>("/tyche/trades/:id", async (req, reply) => {
    const trade = getTrade(Number(req.params.id));
    if (!trade) return reply.code(404).send({ error: "trade not found" });
    return { trade };
  });

  app.get("/tyche/balances", async () => ({
    balances: latestBalances(),
    snapshot: getTycheStatus().balances,
  }));

  app.post<{ Body: { mode?: string; confirm?: string } }>("/tyche/mode", async (req, reply) => {
    const mode = String(req.body?.mode ?? "") as TycheMode;
    if (!["observe", "paper", "sandbox", "live"].includes(mode)) {
      return reply.code(400).send({ error: "invalid mode" });
    }
    const blocked = blockLiveMode(mode);
    if (!blocked.ok) return reply.code(403).send({ error: blocked.error });
    if (mode === "live" && req.body?.confirm !== LIVE_CONFIRM) {
      return reply.code(400).send({ error: `live mode requires confirm: "${LIVE_CONFIRM}"` });
    }
    setRuntimeMode(mode);
    return { ok: true, mode };
  });

  app.post<{ Body: { strategy?: string } }>("/tyche/strategy", async (req, reply) => {
    const strategy = String(req.body?.strategy ?? "") as TycheStrategy;
    if (!["live_only", "static_only", "combined"].includes(strategy)) {
      return reply.code(400).send({ error: "invalid strategy" });
    }
    setRuntimeStrategy(strategy);
    return { ok: true, strategy };
  });

  app.post<{ Body: { paused?: boolean } }>("/tyche/pause", async (req) => {
    const paused = Boolean(req.body?.paused);
    setTychePaused(paused);
    return { ok: true, paused };
  });

  app.post("/tyche/scan", async () => {
    await runScan();
    return { ok: true, status: getTycheStatus() };
  });

  app.get("/tyche/stream", async (req, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const sendStatus = () => {
      const s = getTycheStatus();
      send("status", {
        ...s,
        todayPnlUsd: todayPnlUsd(),
        paused: isTychePaused(),
        session: getSessionStatus(),
        watchdog: getWatchdogState(),
      });
    };

    sendStatus();

    const unsubTrade = onTradeEvent((trade: TradeBundle) => {
      send("trade", trade);
      sendStatus();
    });

    const unsubSys = onSystemEvent((kind, detail) => {
      send("system", { kind, detail, at: new Date().toISOString() });
    });

    const heartbeat = setInterval(() => {
      send("heartbeat", { at: new Date().toISOString() });
      sendStatus();
    }, 15000);

    req.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubTrade();
      unsubSys();
    });
  });
}

export { startTycheLoop };
