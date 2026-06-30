import { config } from "../../config.ts";
import type { Opportunity } from "../models/opportunity.ts";
import type { DualBalances } from "../models/venueBalances.ts";
import { isKilled } from "../../core/guardrails.ts";
import { isTychePaused, shouldAutoPause } from "./killSwitch.ts";
import { bookIsFresh, withinDailyNotional, withinTradeCap } from "./limits.ts";
import { dualBalanceGate } from "../pricing/capitalManager.ts";
import { prophetxIsConfigured } from "../../config.ts";
import { dailyNotionalUsd, countLegFailuresToday, todayPnlUsd } from "../storage/repositories.ts";
import { insertRiskDecision } from "../storage/repositories.ts";
import { evaluateExposure } from "./exposure.ts";
import { getRuntimeBookAgeMs } from "../learning/sessionReview.ts";
import { sessionAllowsExecution } from "../session/sessionManager.ts";

export interface RiskDecision {
  allowed: boolean;
  reasons: string[];
}

export function evaluateRisk(
  opp: Opportunity,
  balances: DualBalances,
  mode: string,
  kalshiFetchedAt: string,
  pxFetchedAt: string,
  opportunityId?: number,
): RiskDecision {
  const reasons: string[] = [];

  if (isKilled()) reasons.push("global kill switch ON");
  if (isTychePaused()) reasons.push("Tyche paused");
  if (shouldAutoPause(countLegFailuresToday(), todayPnlUsd())) reasons.push("auto-pause threshold hit");
  if (!config.tyche.autoExecution) reasons.push("auto-execution disabled");
  if (opp.matchConfidence !== "EXACT_MATCH") reasons.push("not EXACT_MATCH");
  if (!opp.shouldExecute) reasons.push(...opp.rejectionReasons);
  if (!bookIsFresh(kalshiFetchedAt, getRuntimeBookAgeMs())) reasons.push("stale Kalshi book");
  if (!bookIsFresh(pxFetchedAt, getRuntimeBookAgeMs())) reasons.push("stale ProphetX book");

  const notional = opp.bundleCost * opp.maxSize;
  if (!withinTradeCap(notional)) reasons.push("exceeds max trade USD");
  if (!withinDailyNotional(dailyNotionalUsd(), notional)) reasons.push("exceeds daily notional");

  const legAReq = opp.legA.askPrice * opp.maxSize;
  const legBReq = opp.legB.askPrice * opp.maxSize;
  if (!dualBalanceGate(balances, Math.max(legAReq, legBReq))) reasons.push("insufficient dual balance");

  if ((mode === "sandbox" || mode === "live") && !prophetxIsConfigured()) {
    reasons.push("ProphetX not configured for cross-venue orders");
  }

  const exposure = evaluateExposure();
  if (!exposure.allowNewOrders) reasons.push(exposure.reason ?? "exposure limit");
  if (exposure.throttle && exposure.allowNewOrders) reasons.push("exposure throttle active");

  if (mode === "sandbox") {
    const sessionGate = sessionAllowsExecution(notional);
    if (!sessionGate.allowed) reasons.push(sessionGate.reason ?? "session cap");
  }

  const allowed = reasons.length === 0;
  insertRiskDecision(opportunityId ?? null, allowed, reasons);
  return { allowed, reasons };
}
