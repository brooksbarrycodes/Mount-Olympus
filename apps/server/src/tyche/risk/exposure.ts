import { latestBalances } from "../storage/repositories.ts";

/** Track unmatched exposure vs cash (Anthony 10x / 50x rules). */
let unmatchedStakeUsd = 0;

export function getUnmatchedExposureUsd(): number {
  return unmatchedStakeUsd;
}

export function addUnmatchedStake(usd: number): void {
  unmatchedStakeUsd += usd;
}

export function releaseUnmatchedStake(usd: number): void {
  unmatchedStakeUsd = Math.max(0, unmatchedStakeUsd - usd);
}

export function resetExposure(): void {
  unmatchedStakeUsd = 0;
}

export interface ExposureDecision {
  allowNewOrders: boolean;
  throttle: boolean;
  ratio: number;
  reason: string | null;
}

export function evaluateExposure(): ExposureDecision {
  const bals = latestBalances();
  const kalshi = bals.find((b) => b.venue === "kalshi")?.availableUsd ?? 0;
  const px = bals.find((b) => b.venue === "prophetx")?.availableUsd ?? 0;
  const cash = Math.min(kalshi, px, kalshi + px);
  if (cash <= 0) {
    return { allowNewOrders: false, throttle: true, ratio: Infinity, reason: "no cash balance" };
  }
  const ratio = unmatchedStakeUsd / cash;
  if (ratio >= 10) {
    return { allowNewOrders: false, throttle: true, ratio, reason: "exposure >= 10x cash" };
  }
  if (ratio >= 8) {
    return { allowNewOrders: true, throttle: true, ratio, reason: "exposure >= 8x cash — throttling" };
  }
  return { allowNewOrders: true, throttle: false, ratio, reason: null };
}

export function exposureLimits(): { throttleAt: number; pauseAt: number } {
  return { throttleAt: 8, pauseAt: 10 };
}
