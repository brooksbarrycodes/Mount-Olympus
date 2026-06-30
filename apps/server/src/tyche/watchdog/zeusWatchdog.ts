import { isKilled } from "../../core/guardrails.ts";
import { getTycheStatus } from "../tycheLoop.ts";
import { getProphetxTokenRefreshFailures } from "../venues/prophetx/client.ts";
import {
  insertSystemEvent,
  legFailureRateRecent,
} from "../storage/repositories.ts";
import { isTychePaused, setTychePaused } from "../risk/killSwitch.ts";
import { evaluateExposure } from "../risk/exposure.ts";
import {
  checkSessionExpiry,
  getSessionStatus,
  stopSandboxSession,
} from "../session/sessionManager.ts";
import { stopTycheLoop } from "../tycheLoop.ts";

let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastWatchdogState: Record<string, unknown> = {};

export function getWatchdogState(): Record<string, unknown> {
  return { ...lastWatchdogState };
}

export function startZeusWatchdog(): void {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    void tickWatchdog().catch((err) => console.warn("Zeus watchdog error:", err));
  }, 60_000);
  void tickWatchdog();
}

export function stopZeusWatchdog(): void {
  if (watchdogTimer) clearInterval(watchdogTimer);
  watchdogTimer = null;
}

async function tickWatchdog(): Promise<void> {
  const session = getSessionStatus();
  if (!session.active) {
    lastWatchdogState = { active: false, at: new Date().toISOString() };
    return;
  }

  const actions: string[] = [];

  if (await checkSessionExpiry()) {
    stopTycheLoop();
    stopZeusWatchdog();
    actions.push("time_cap");
  }

  if (isKilled()) {
    setTychePaused(true);
    actions.push("global_kill_switch");
  }

  const status = getTycheStatus();
  const lastScan = status.lastScanAt ? Date.now() - new Date(status.lastScanAt).getTime() : Infinity;
  if (lastScan > 30_000 && !isTychePaused()) {
    setTychePaused(true);
    actions.push("stale_scan");
  }

  if (legFailureRateRecent(10) > 0.3) {
    setTychePaused(true);
    actions.push("leg_failure_spike");
  }

  if (getProphetxTokenRefreshFailures() >= 3) {
    setTychePaused(true);
    actions.push("prophetx_token_failures");
  }

  const exposure = evaluateExposure();
  if (!exposure.allowNewOrders) {
    setTychePaused(true);
    actions.push("exposure_limit");
  }

  const kOk = status.venueHealth?.kalshi.connected && status.venueHealth.kalshi.dataSource === "live";
  const pOk =
    status.venueHealth?.prophetx.connected && status.venueHealth.prophetx.dataSource === "live";
  if (!kOk || !pOk) {
    setTychePaused(true);
    actions.push("venue_unhealthy");
  }

  if (actions.length > 0) {
    insertSystemEvent("watchdog_pause", { actions, exposure, lastScanMs: lastScan });
  }

  lastWatchdogState = {
    active: true,
    at: new Date().toISOString(),
    sessionRemainingMs: session.remainingMs,
    paused: isTychePaused(),
    actions,
    exposure,
  };
}

export async function emergencyStopTyche(reason: string): Promise<void> {
  setTychePaused(true);
  insertSystemEvent("watchdog_emergency", { reason });
  await stopSandboxSession(reason);
  stopTycheLoop();
  stopZeusWatchdog();
}
