import { config, prophetxIsConfigured } from "../../config.ts";
import type { Opportunity } from "../models/opportunity.ts";
import type { TradeBundle, TradeLeg } from "../models/tradeBundle.ts";
import { feeForLeg } from "../pricing/fees.ts";
import { modeAllowsExecution, modeUsesRealOrders } from "./modes.ts";
import { handleLegRisk } from "./legRiskManager.ts";
import { insertTrade, updateTradeStatus } from "../storage/repositories.ts";
import { nowIso } from "../../core/db.ts";
import { recordCredit, recordCost } from "../../treasury/ledger.ts";
import { submitKalshiOrder, cancelKalshiOrder } from "../venues/kalshi/orders.ts";
import { submitProphetxOrder, cancelProphetxOrder } from "../venues/prophetx/orders.ts";
import { sessionAllowsExecution, recordSessionOrder } from "../session/sessionManager.ts";
import { insertSystemEvent } from "../storage/repositories.ts";
import type { TycheMode } from "../../config.ts";

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

function computeActualPnl(legs: TradeLeg[], qty: number): number {
  const filled = legs.filter((l) => l.status === "filled" && l.filledQty >= qty);
  if (filled.length !== 2) return 0;
  const cost = filled.reduce((s, l) => s + l.price * l.filledQty, 0);
  const fees = filled.reduce((s, l) => s + l.feeUsd, 0);
  return qty - cost - fees;
}

async function placeSandboxLeg(leg: TradeLeg, opp: Opportunity, which: "A" | "B"): Promise<TradeLeg> {
  if (which === "A") {
    const ticker = opp.legA.ticker ?? opp.legA.marketId;
    if (!ticker || ticker.startsWith("MOCK")) {
      return { ...leg, status: "failed" };
    }
    const result = await submitKalshiOrder({
      ticker,
      side: leg.side,
      quantity: leg.quantity,
      priceProb: leg.price,
    });
    return {
      ...leg,
      orderId: result.orderId,
      status: result.status === "filled" ? "filled" : result.status === "partial" ? "partial" : "failed",
      filledQty: result.filledQty,
      price: result.fillPriceProb ?? leg.price,
    };
  }

  const strikeId = opp.legB.strikeId;
  const americanOdds = opp.legB.americanOdds;
  if (!strikeId || americanOdds == null) {
    return { ...leg, status: "failed" };
  }
  const result = await submitProphetxOrder({
    strikeId,
    americanOdds,
    quantity: leg.quantity,
    fillOrKill: true,
  });
  return {
    ...leg,
    orderId: result.orderId,
    status: result.status === "filled" ? "filled" : result.status === "partial" ? "partial" : "failed",
    filledQty: result.filledQty,
  };
}

async function unwindLeg(leg: TradeLeg, opp: Opportunity): Promise<void> {
  if (!leg.orderId) return;
  if (leg.venue === "kalshi") {
    await cancelKalshiOrder(leg.orderId, opp.legA.ticker ?? opp.legA.marketId);
  } else {
    await cancelProphetxOrder(leg.orderId);
  }
}

async function placeRealLegs(opp: Opportunity, legs: TradeLeg[]): Promise<TradeLeg[]> {
  const [legA, legB] = legs;
  const start = Date.now();
  const [filledA, filledB] = await Promise.all([
    placeSandboxLeg(legA, opp, "A"),
    placeSandboxLeg(legB, opp, "B"),
  ]);

  insertSystemEvent("leg_submit", {
    event: opp.eventName,
    delayMs: Date.now() - start,
    legA: { status: filledA.status, orderId: filledA.orderId },
    legB: { status: filledB.status, orderId: filledB.orderId },
  });

  const aOk = filledA.status === "filled" && filledA.filledQty >= legA.quantity;
  const bOk = filledB.status === "filled" && filledB.filledQty >= legB.quantity;

  if (aOk && !bOk) {
    await unwindLeg(filledA, opp);
    filledA.status = "cancelled";
  } else if (bOk && !aOk) {
    await unwindLeg(filledB, opp);
    filledB.status = "cancelled";
  }

  return [filledA, filledB];
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
    return { executed: false, reason: "ProphetX not configured for sandbox orders" };
  }

  const notional = opp.bundleCost * opp.maxSize;
  if (mode === "sandbox") {
    const sessionGate = sessionAllowsExecution(notional);
    if (!sessionGate.allowed) {
      return { executed: false, reason: sessionGate.reason ?? "session blocked" };
    }
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
    filledLegs = await placeRealLegs(opp, legs);
  } else {
    filledLegs = await simulateFills(legs, mode);
  }

  const outcome = handleLegRisk(filledLegs, opp.worstCaseProfitUsd);
  const bothFilled = filledLegs.every((l) => l.status === "filled" && l.filledQty >= l.quantity);
  const actualPnl = bothFilled ? computeActualPnl(filledLegs, opp.maxSize) : outcome.actualPnlUsd;
  const finalStatus = outcome.success && bothFilled ? "success" : "failed";
  updateTradeStatus(tradeId, finalStatus, actualPnl, outcome.failureReason);

  const bundle: TradeBundle = {
    ...pending,
    id: tradeId,
    status: finalStatus,
    legs: outcome.legs,
    actualPnlUsd: actualPnl,
    failureReason: outcome.failureReason,
    settledAt: nowIso(),
  };
  emitTradeEvent(tradeId, bundle);

  if (mode === "sandbox") {
    recordSessionOrder(finalStatus === "success", notional);
  }

  const pnl = actualPnl ?? 0;
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

  insertSystemEvent("trade_settled", {
    tradeId,
    status: finalStatus,
    actualPnlUsd: actualPnl,
    event: opp.eventName,
  });

  return { executed: true, tradeId, bundle };
}

type TradeListener = (trade: TradeBundle) => void;
const listeners = new Set<TradeListener>();

type SystemEventListener = (kind: string, detail: Record<string, unknown>) => void;
const systemListeners = new Set<SystemEventListener>();

export function onTradeEvent(fn: TradeListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onSystemEvent(fn: SystemEventListener): () => void {
  systemListeners.add(fn);
  return () => systemListeners.delete(fn);
}

function emitTradeEvent(_id: number, bundle: TradeBundle): void {
  for (const fn of listeners) fn(bundle);
}

export function emitSystemEvent(kind: string, detail: Record<string, unknown>): void {
  for (const fn of systemListeners) fn(kind, detail);
}
