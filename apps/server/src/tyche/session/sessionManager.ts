import { config, type TycheStrategy } from "../../config.ts";
import { runPreflight } from "../preflight.ts";
import {
  createSessionRow,
  getActiveSessionRow,
  getLatestSessionRow,
  getSessionRow,
  insertSystemEvent,
  updateSessionRow,
  type TycheSessionRow,
} from "../storage/repositories.ts";
import {
  getRuntimeStrategy,
  setRuntimeMode,
  setRuntimeStrategy,
  setSessionScanEnabled,
} from "../runtimeContext.ts";
import { setTychePaused } from "../risk/killSwitch.ts";
import { resetExposure } from "../risk/exposure.ts";
import { writeSessionPostmortem } from "../learning/sessionReview.ts";

export interface SessionPublicStatus {
  active: boolean;
  session: TycheSessionRow | null;
  remainingMs: number | null;
  ordersPlaced: number;
  ordersCap: number;
  notionalUsd: number;
  notionalCap: number;
}

function configSnapshot(): Record<string, unknown> {
  return {
    maxTradeUsd: config.tyche.maxTradeUsd,
    maxDailyNotionalUsd: config.tyche.maxDailyNotionalUsd,
    minWorstCaseProfitUsd: config.tyche.minWorstCaseProfitUsd,
    minWorstCaseRoi: config.tyche.minWorstCaseRoi,
    scanIntervalMs: config.tyche.scanIntervalMs,
    sessionMaxOrders: config.tyche.sessionMaxOrders,
    sessionMaxNotionalUsd: config.tyche.sessionMaxNotionalUsd,
    sessionMaxDurationMs: config.tyche.sessionMaxDurationMs,
  };
}

export function getSessionStatus(): SessionPublicStatus {
  const session = getActiveSessionRow();
  if (!session || session.status !== "running") {
    return {
      active: false,
      session: getLatestSessionRow() ?? null,
      remainingMs: null,
      ordersPlaced: 0,
      ordersCap: config.tyche.sessionMaxOrders,
      notionalUsd: 0,
      notionalCap: config.tyche.sessionMaxNotionalUsd,
    };
  }
  const endsAt = session.endsAt ? new Date(session.endsAt).getTime() : 0;
  const remainingMs = endsAt > 0 ? Math.max(0, endsAt - Date.now()) : null;
  return {
    active: true,
    session,
    remainingMs,
    ordersPlaced: session.ordersPlaced,
    ordersCap: config.tyche.sessionMaxOrders,
    notionalUsd: session.notionalUsd,
    notionalCap: config.tyche.sessionMaxNotionalUsd,
  };
}

export async function startSandboxSession(): Promise<{ ok: boolean; error?: string; sessionId?: number }> {
  const existing = getActiveSessionRow();
  if (existing?.status === "running") {
    return { ok: false, error: "Session already running" };
  }

  const preflight = await runPreflight();
  if (!preflight.ready) {
    insertSystemEvent("preflight_failed", { reasons: preflight.reasons });
    return { ok: false, error: preflight.reasons.join("; ") };
  }

  const startedAt = new Date().toISOString();
  const endsAt = new Date(Date.now() + config.tyche.sessionMaxDurationMs).toISOString();
  const strategy = getRuntimeStrategy();

  const sessionId = createSessionRow({
    status: "running",
    mode: "sandbox",
    strategy,
    startedAt,
    endsAt,
    stoppedAt: null,
    stopReason: null,
    ordersPlaced: 0,
    ordersFailed: 0,
    notionalUsd: 0,
    configSnapshot: configSnapshot(),
  });

  setRuntimeMode("sandbox");
  setRuntimeStrategy(strategy);
  setSessionScanEnabled(true);
  setTychePaused(false);
  resetExposure();

  insertSystemEvent("session_start", { sessionId, startedAt, endsAt, strategy });
  return { ok: true, sessionId };
}

export async function stopSandboxSession(reason = "manual_stop"): Promise<{ ok: boolean; sessionId?: number }> {
  const session = getActiveSessionRow();
  if (!session) {
    setSessionScanEnabled(false);
    return { ok: true };
  }

  setSessionScanEnabled(false);
  setTychePaused(true);

  updateSessionRow(session.id, {
    status: reason === "time_cap" ? "expired" : "stopped",
    stoppedAt: new Date().toISOString(),
    stopReason: reason,
  });

  insertSystemEvent("session_stop", { sessionId: session.id, reason });
  await writeSessionPostmortem(session.id);

  return { ok: true, sessionId: session.id };
}

export function recordSessionOrder(success: boolean, notionalUsd: number): void {
  const session = getActiveSessionRow();
  if (!session) return;
  updateSessionRow(session.id, {
    ordersPlaced: session.ordersPlaced + 1,
    ordersFailed: success ? session.ordersFailed : session.ordersFailed + 1,
    notionalUsd: session.notionalUsd + notionalUsd,
  });
}

export function sessionAllowsExecution(notionalUsd: number): { allowed: boolean; reason?: string } {
  const session = getActiveSessionRow();
  if (!session || session.status !== "running") {
    return { allowed: false, reason: "no active session" };
  }
  if (session.endsAt && Date.now() >= new Date(session.endsAt).getTime()) {
    return { allowed: false, reason: "session time cap" };
  }
  if (session.ordersPlaced >= config.tyche.sessionMaxOrders) {
    return { allowed: false, reason: "session order cap" };
  }
  if (session.notionalUsd + notionalUsd > config.tyche.sessionMaxNotionalUsd) {
    return { allowed: false, reason: "session notional cap" };
  }
  return { allowed: true };
}

export async function checkSessionExpiry(): Promise<boolean> {
  const session = getActiveSessionRow();
  if (!session?.endsAt) return false;
  if (Date.now() >= new Date(session.endsAt).getTime()) {
    await stopSandboxSession("time_cap");
    return true;
  }
  return false;
}

export function setRuntimeStrategyFromSession(strategy: TycheStrategy): void {
  setRuntimeStrategy(strategy);
}

export { getSessionRow };
