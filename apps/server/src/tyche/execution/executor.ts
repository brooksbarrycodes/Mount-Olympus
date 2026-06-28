import { config, prophetxIsConfigured, type TycheMode } from "../../config.ts";
import type { Opportunity } from "../models/opportunity.ts";
import type { TradeBundle, TradeLeg } from "../models/tradeBundle.ts";
import { feeForLeg } from "../pricing/fees.ts";
import { modeAllowsExecution, modeUsesRealOrders } from "./modes.ts";
import { handleLegRisk } from "./legRiskManager.ts";
import { insertTrade, updateTradeStatus } from "../storage/repositories.ts";
import { nowIso } from "../../core/db.ts";
import { recordCredit, recordCost } from "../../treasury/ledger.ts";

function buildLegs(opp: Opportunity): TradeLeg[] {
  const qty = opp.maxSize;
  return [
    {
      venue: opp.legA.venue,
      marketId: opp.legA.marketId,
      side: opp.legA.side,
      price: opp.legA.askPrice,
      quantity: qty,
      orderId: null,
      status: "pending",
      filledQty: 0,
      feeUsd: feeForLeg(opp.legA.venue, opp.legA.askPrice * qty),
    },
    {
      venue: opp.legB.venue,
      marketId: opp.legB.marketId,
      side: opp.legB.side,
      price: opp.legB.askPrice,
      quantity: qty,
      orderId: null,
      status: "pending",
      filledQty: 0,
      feeUsd: feeForLeg(opp.legB.venue, opp.legB.askPrice * qty),
    },
  ];
}

async function simulateFills(legs: TradeLeg[], mode: TycheMode): Promise<TradeLeg[]> {
  await new Promise((r) => setTimeout(r, mode === "paper" ? 800 : 300));
  return legs.map((l, i) => ({
    ...l,
    orderId: `PAPER-${Date.now()}-${i}`,
    status: "filled" as const,
    filledQty: l.quantity,
  }));
}

async function placeRealLeg(leg: TradeLeg): Promise<TradeLeg> {
  // Skeleton: real limit order placement when sandbox/live keys verified
  return {
    ...leg,
    orderId: `LIVE-${Date.now()}`,
    status: "filled",
    filledQty: leg.quantity,
  };
}

export interface ExecuteResult {
  executed: boolean;
  tradeId?: number;
  bundle?: TradeBundle;
  reason?: string;
}

export async function executeOpportunity(opp: Opportunity, mode: TycheMode): Promise<ExecuteResult> {
  if (!modeAllowsExecution(mode)) {
    return { executed: false, reason: `mode ${mode} does not execute` };
  }
  if (modeUsesRealOrders(mode) && !prophetxIsConfigured() && opp.legB.venue === "prophetx") {
    return { executed: false, reason: "ProphetX not configured for live orders" };
  }

  const legs = buildLegs(opp);
  const pending: TradeBundle = {
    status: "pending",
    strategy: config.tyche.strategy,
    eventName: opp.eventName,
    sport: opp.sport,
    matchConfidence: opp.matchConfidence,
    lockedProfitUsd: opp.worstCaseProfitUsd,
    actualPnlUsd: null,
    failureReason: null,
    legs,
    createdAt: nowIso(),
  };
  const tradeId = insertTrade(pending);
  emitTradeEvent(tradeId, pending);

  let filledLegs: TradeLeg[];
  if (modeUsesRealOrders(mode)) {
    filledLegs = await Promise.all(legs.map((l) => placeRealLeg(l)));
  } else {
    filledLegs = await simulateFills(legs, mode);
  }

  const outcome = handleLegRisk(filledLegs, opp.worstCaseProfitUsd);
  const finalStatus = outcome.success ? "success" : "failed";
  updateTradeStatus(tradeId, finalStatus, outcome.actualPnlUsd, outcome.failureReason);

  const bundle: TradeBundle = {
    ...pending,
    id: tradeId,
    status: finalStatus,
    legs: outcome.legs,
    actualPnlUsd: outcome.actualPnlUsd,
    failureReason: outcome.failureReason,
    settledAt: nowIso(),
  };
  emitTradeEvent(tradeId, bundle);

  const pnl = outcome.actualPnlUsd ?? 0;
  if (pnl > 0) {
    recordCredit({
      label: `Tyche arb: ${opp.eventName}`,
      amountUsd: pnl,
      category: "trading",
      attributedGodId: "tyche",
      source: "auto",
      reference: `trade-${tradeId}`,
    });
  } else if (pnl < 0) {
    recordCost({
      label: `Tyche arb loss: ${opp.eventName}`,
      amountUsd: Math.abs(pnl),
      category: "trading",
      attributedGodId: "tyche",
      source: "auto",
      reference: `trade-${tradeId}`,
    });
  }

  return { executed: true, tradeId, bundle };
}

type TradeListener = (trade: TradeBundle) => void;
const listeners = new Set<TradeListener>();

export function onTradeEvent(fn: TradeListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitTradeEvent(_id: number, bundle: TradeBundle): void {
  for (const fn of listeners) fn(bundle);
}
