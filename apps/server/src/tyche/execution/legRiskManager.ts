import type { TradeLeg } from "../models/tradeBundle.ts";

export interface LegOutcome {
  success: boolean;
  legs: TradeLeg[];
  failureReason: string | null;
  actualPnlUsd: number | null;
}

/** If one leg fills and the other fails, mark failed and attempt unwind. */
export function handleLegRisk(legs: TradeLeg[], lockedProfitUsd: number): LegOutcome {
  const filled = legs.filter((l) => l.status === "filled");
  const failed = legs.filter((l) => l.status === "failed" || l.status === "cancelled");

  if (filled.length === 2) {
    return { success: true, legs, failureReason: null, actualPnlUsd: lockedProfitUsd };
  }
  if (filled.length === 1 && failed.length >= 1) {
    const updated = legs.map((l) =>
      l.status === "filled" ? { ...l, status: "cancelled" as const } : l,
    );
    return {
      success: false,
      legs: updated,
      failureReason: "leg risk: one side filled, unwind attempted",
      actualPnlUsd: 0,
    };
  }
  if (failed.length === 2) {
    return { success: false, legs, failureReason: "both legs failed", actualPnlUsd: 0 };
  }
  return { success: false, legs, failureReason: "timeout or partial", actualPnlUsd: null };
}
