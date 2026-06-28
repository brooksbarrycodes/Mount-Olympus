/** Format time remaining until an absolute ISO deadline (wall clock, works offline). */
export function formatCountdown(dueAt: string | null, nowMs: number = Date.now()): string {
  if (!dueAt) return "";
  const ms = new Date(dueAt).getTime() - nowMs;
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return "overdue";

  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function dueFromHours(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function dueFromDays(days: number): string {
  return dueFromHours(days * 24);
}

export function isUrgent(dueAt: string | null, nowMs: number = Date.now()): boolean {
  if (!dueAt) return false;
  const ms = new Date(dueAt).getTime() - nowMs;
  return ms <= 0 || ms < 86400_000;
}
