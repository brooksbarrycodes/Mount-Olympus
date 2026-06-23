import { runDailyReport } from "./agents/oracle.ts";

/**
 * Lightweight scheduler. The Oracle does NOT run continuously - she produces
 * one report per day (and is otherwise on-call). This avoids burning tokens
 * idling. Interval-based so there is nothing to install.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | undefined;

export function startScheduler(): void {
  if (timer) return;
  // Produce one report shortly after boot so the Oracle has a fresh read and a
  // niche on the board. Fire-and-forget so it never blocks the server starting.
  runDailyReport().catch((err) => {
    console.error("[scheduler] initial report failed:", err);
  });
  timer = setInterval(() => {
    runDailyReport().catch((err) => {
      console.error("[scheduler] daily report failed:", err);
    });
  }, DAY_MS);
  // Do not block process exit on this timer.
  timer.unref?.();
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}
