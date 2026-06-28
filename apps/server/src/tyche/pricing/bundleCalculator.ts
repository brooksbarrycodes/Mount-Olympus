import { config } from "../../config.ts";
import type { NormalizedMarket } from "../models/normalizedMarket.ts";
import type { MatchedPair } from "../models/marketMatch.ts";
import type { Opportunity } from "../models/opportunity.ts";
import { totalFeesUsd, feesKnown } from "./fees.ts";

const PAYOUT = 1;

export interface BundleInput {
  pair: MatchedPair;
  kalshi: NormalizedMarket;
  px: NormalizedMarket;
  balanceKalshi: number;
  balancePx: number;
  strategy: string;
}

export function bundleCost(yesAsk: number, noAsk: number): number {
  return yesAsk + noAsk;
}

export function computeMaxSize(
  yesDepth: number,
  noDepth: number,
  balanceKalshi: number,
  balancePx: number,
  yesPrice: number,
  noPrice: number,
): number {
  const byDepth = Math.min(yesDepth, noDepth);
  const byKalshi = yesPrice > 0 ? Math.floor(balanceKalshi / yesPrice) : 0;
  const byPx = noPrice > 0 ? Math.floor(balancePx / noPrice) : 0;
  const byTradeCap = Math.floor(config.tyche.maxTradeUsd / Math.max(yesPrice, noPrice, 0.01));
  return Math.max(0, Math.min(byDepth, byKalshi, byPx, byTradeCap));
}

export function hoursToSettlement(startTime: string): number {
  const ms = new Date(startTime).getTime() - Date.now();
  return Math.max(ms / 3_600_000, 0.25);
}

export function priorityScore(netEdge: number, startTime: string, isLive: boolean): number {
  const denom = isLive ? Math.max(hoursToSettlement(startTime) * 60, 15) / 60 : hoursToSettlement(startTime);
  return netEdge / denom;
}

export function strategyTag(isLive: boolean): "live" | "static" {
  return isLive ? "live" : "static";
}

export function passesStrategyFilter(tag: "live" | "static"): boolean {
  const s = config.tyche.strategy;
  if (s === "combined") return true;
  if (s === "live_only") return tag === "live";
  return tag === "static";
}

export function calculateOpportunity(input: BundleInput): Opportunity {
  const { pair, kalshi, px, balanceKalshi, balancePx } = input;
  const yesAsk = kalshi.yesAsk;
  const noAsk = px.noAsk;
  const cost = bundleCost(yesAsk, noAsk);
  const grossEdge = PAYOUT - cost;
  const maxSize = computeMaxSize(
    kalshi.yesAskDepth,
    px.noAskDepth,
    balanceKalshi,
    balancePx,
    yesAsk,
    noAsk,
  );
  const legANotional = yesAsk * maxSize;
  const legBNotional = noAsk * maxSize;
  const fees = feesKnown(["kalshi", "prophetx"])
    ? totalFeesUsd(legANotional, legBNotional, "kalshi", "prophetx")
    : Infinity;
  const slippageBuffer = config.tyche.maxSlippage * maxSize * 2;
  const netEdge = grossEdge * maxSize - fees - slippageBuffer;
  const notional = cost * maxSize;
  const worstCaseRoi = notional > 0 ? netEdge / notional : 0;
  const tag = strategyTag(kalshi.isLive || px.isLive);
  const rejectionReasons: string[] = [];

  if (pair.confidence !== "EXACT_MATCH") rejectionReasons.push("not EXACT_MATCH");
  if (!passesStrategyFilter(tag)) rejectionReasons.push(`strategy filter: ${config.tyche.strategy}`);
  if (maxSize <= 0) rejectionReasons.push("insufficient size/capital");
  if (netEdge < config.tyche.minWorstCaseProfitUsd) rejectionReasons.push("below min profit");
  if (worstCaseRoi < config.tyche.minWorstCaseRoi) rejectionReasons.push("below min ROI");
  if (!feesKnown(["kalshi", "prophetx"])) rejectionReasons.push("fees unknown");

  const prio = priorityScore(netEdge, kalshi.startTime, kalshi.isLive);

  return {
    eventName: pair.eventName,
    sport: pair.sport,
    strategyTag: tag,
    matchConfidence: pair.confidence,
    legA: {
      venue: "kalshi",
      marketId: kalshi.marketId,
      side: "yes",
      askPrice: yesAsk,
      depth: kalshi.yesAskDepth,
    },
    legB: {
      venue: "prophetx",
      marketId: px.marketId,
      side: "no",
      askPrice: noAsk,
      depth: px.noAskDepth,
    },
    bundleCost: cost,
    grossEdge,
    netEdge,
    worstCaseProfitUsd: netEdge,
    worstCaseRoi,
    maxSize,
    priorityScore: prio,
    shouldExecute: rejectionReasons.length === 0,
    rejectionReasons,
  };
}

export function rankOpportunities(opps: Opportunity[]): Opportunity[] {
  return [...opps].sort((a, b) => b.priorityScore - a.priorityScore);
}
