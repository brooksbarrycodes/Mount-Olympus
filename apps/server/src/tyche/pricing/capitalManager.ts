import type { DualBalances } from "../models/venueBalances.ts";

/** Track free cash per venue; skip when deployed capital is high. */
export function dualBalanceGate(balances: DualBalances, requiredUsd: number): boolean {
  return balances.kalshi.availableUsd >= requiredUsd && balances.prophetx.availableUsd >= requiredUsd;
}

export function computeDualBalances(
  kalshi: { availableUsd: number; totalUsd: number },
  px: { availableUsd: number; totalUsd: number },
  deployedUsd = 0,
): DualBalances {
  const kBal = {
    venue: "kalshi" as const,
    availableUsd: kalshi.availableUsd,
    deployedUsd: deployedUsd / 2,
    totalUsd: kalshi.totalUsd,
    fetchedAt: new Date().toISOString(),
  };
  const pBal = {
    venue: "prophetx" as const,
    availableUsd: px.availableUsd,
    deployedUsd: deployedUsd / 2,
    totalUsd: px.totalUsd,
    fetchedAt: new Date().toISOString(),
  };
  return {
    kalshi: kBal,
    prophetx: pBal,
    freeUsd: kBal.availableUsd + pBal.availableUsd,
    deployedUsd,
  };
}
