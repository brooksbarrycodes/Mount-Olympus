import type { TycheTradeBundle } from "@/net/agentApi";

/** Pending = yellow; settled profit ≥ $0 = green; settled profit < $0 = red. */
export function bundleProfitUsd(bundle: TycheTradeBundle): number {
  if (bundle.status === "pending") return bundle.lockedProfitUsd;
  return bundle.actualPnlUsd ?? bundle.lockedProfitUsd;
}

export function bundleRowClass(bundle: TycheTradeBundle): string {
  if (bundle.status === "pending") return "tyche-desk-bundle tyche-desk-bundle--pending";
  const pnl = bundleProfitUsd(bundle);
  if (pnl >= 0) return "tyche-desk-bundle tyche-desk-bundle--profit";
  return "tyche-desk-bundle tyche-desk-bundle--loss";
}
