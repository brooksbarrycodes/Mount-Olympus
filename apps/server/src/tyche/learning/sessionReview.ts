import {
  getSessionRow,
  insertSystemEvent,
  listTrades,
  legFailureRateRecent,
  updateSessionRow,
} from "../storage/repositories.ts";
import { config } from "../../config.ts";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DOCS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../docs/tyche");

let runtimeMinRoi = config.tyche.minWorstCaseRoi;
let runtimeBookAgeMs = config.tyche.maxOrderbookAgeMs;

export function getRuntimeMinRoi(): number {
  return runtimeMinRoi;
}

export function getRuntimeBookAgeMs(): number {
  return runtimeBookAgeMs;
}

export async function writeSessionPostmortem(sessionId: number): Promise<void> {
  const session = getSessionRow(sessionId);
  if (!session?.startedAt) return;

  const trades = listTrades(100).filter((t) => (t.createdAt ?? "") >= session.startedAt!);
  const attempted = trades.length;
  const succeeded = trades.filter((t) => t.status === "success").length;
  const failed = trades.filter((t) => t.status === "failed").length;
  const fillRate = attempted > 0 ? succeeded / attempted : 0;
  const legFailureRate = attempted > 0 ? failed / attempted : 0;
  const totalPnl = trades.reduce((s, t) => s + (t.actualPnlUsd ?? 0), 0);
  const avgLocked = attempted > 0 ? trades.reduce((s, t) => s + t.lockedProfitUsd, 0) / attempted : 0;

  const tuning: string[] = [];
  if (legFailureRate > 0.2) {
    runtimeMinRoi = Math.min(runtimeMinRoi + 0.005, 0.05);
    tuning.push(`Raised min ROI to ${runtimeMinRoi.toFixed(3)} (leg failures ${(legFailureRate * 100).toFixed(0)}%)`);
  }
  if (failed > 0 && legFailureRateRecent(10) > 0.3) {
    runtimeBookAgeMs = Math.max(500, runtimeBookAgeMs - 100);
    tuning.push(`Tightened max book age to ${runtimeBookAgeMs}ms`);
  }

  const postmortem = {
    sessionId,
    startedAt: session.startedAt,
    stoppedAt: session.stoppedAt,
    stopReason: session.stopReason,
    attempted,
    succeeded,
    failed,
    fillRate,
    legFailureRate,
    totalPnlUsd: totalPnl,
    avgLockedProfitUsd: avgLocked,
    tuning,
    strategySuggestion:
      fillRate === 0 && attempted === 0
        ? "Consider combined strategy or verify live market overlap"
        : null,
  };

  insertSystemEvent("session_postmortem", postmortem);
  updateSessionRow(sessionId, { configSnapshot: { ...session.configSnapshot, postmortem } });

  try {
    if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });
    const logPath = path.join(DOCS_DIR, "session-log.md");
    const header = existsSync(logPath) ? "" : "# Tyche sandbox session log\n\n";
    const entry = [
      header,
      `## Session ${sessionId} — ${session.startedAt?.slice(0, 10) ?? "?"}`,
      `- Stop reason: ${session.stopReason ?? "unknown"}`,
      `- Trades: ${attempted} attempted, ${succeeded} success, ${failed} failed`,
      `- Fill rate: ${(fillRate * 100).toFixed(1)}%`,
      `- P&L: $${totalPnl.toFixed(2)}`,
      tuning.length ? `- Auto-tuning: ${tuning.join("; ")}` : "",
      "",
    ]
      .filter(Boolean)
      .join("\n");
    appendFileSync(logPath, entry + "\n");
  } catch (err) {
    console.warn("Could not write session-log.md:", err);
  }
}
