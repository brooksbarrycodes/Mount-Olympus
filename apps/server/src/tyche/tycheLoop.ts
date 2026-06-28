import { config, type TycheMode, type TycheStrategy } from "../config.ts";
import type { Opportunity } from "./models/opportunity.ts";
import type { TradeBundle } from "./models/tradeBundle.ts";
import type { DualBalances } from "./models/venueBalances.ts";
import { fetchKalshiMarkets, fetchKalshiBalance, kalshiHealth } from "./venues/kalshi/client.ts";
import { fetchProphetxMarkets, fetchProphetxBalance, prophetxHealth } from "./venues/prophetx/client.ts";
import { matchMarkets } from "./matching/marketMatcher.ts";
import { detectOpportunities } from "./pricing/opportunityDetector.ts";
import { computeDualBalances } from "./pricing/capitalManager.ts";
import { evaluateRisk } from "./risk/riskEngine.ts";
import { executeOpportunity } from "./execution/executor.ts";
import {
  insertOpportunity,
  insertBalance,
  insertSystemEvent,
  listRecentOpportunities,
  listTrades,
} from "./storage/repositories.ts";
import { initTycheSchema, seedTycheBusiness } from "./storage/schema.ts";
import { isTychePaused } from "./risk/killSwitch.ts";

export interface TycheVenueHealth {
  kalshi: Awaited<ReturnType<typeof kalshiHealth>>;
  prophetx: Awaited<ReturnType<typeof prophetxHealth>>;
}

export interface TycheStatus {
  mode: TycheMode;
  strategy: TycheStrategy;
  autoExecution: boolean;
  paused: boolean;
  lastScanAt: string | null;
  opportunities: Opportunity[];
  recentTrades: TradeBundle[];
  balances: DualBalances | null;
  venueHealth: TycheVenueHealth | null;
  todayPnlUsd: number;
}

let status: TycheStatus = {
  mode: config.tyche.mode,
  strategy: config.tyche.strategy,
  autoExecution: config.tyche.autoExecution,
  paused: false,
  lastScanAt: null,
  opportunities: [],
  recentTrades: [],
  balances: null,
  venueHealth: null,
  todayPnlUsd: 0,
};

let loopTimer: ReturnType<typeof setInterval> | null = null;
let runtimeMode = config.tyche.mode;
let runtimeStrategy = config.tyche.strategy;

export function getTycheStatus(): TycheStatus {
  return { ...status, mode: runtimeMode, strategy: runtimeStrategy };
}

export function setRuntimeMode(mode: TycheMode): void {
  runtimeMode = mode;
  insertSystemEvent("mode_change", { mode });
  status.mode = mode;
}

export function setRuntimeStrategy(strategy: TycheStrategy): void {
  runtimeStrategy = strategy;
  insertSystemEvent("strategy_change", { strategy });
  status.strategy = strategy;
}

export async function runScan(): Promise<void> {
  if (isTychePaused()) {
    status.paused = true;
    return;
  }
  status.paused = false;

  const [kHealth, pHealth] = await Promise.all([kalshiHealth(), prophetxHealth()]);
  status.venueHealth = { kalshi: kHealth, prophetx: pHealth };

  const kalshiMarkets = await fetchKalshiMarkets();
  const pxMarkets = await fetchProphetxMarkets(kalshiMarkets);
  const kBal = await fetchKalshiBalance();
  const pBal = await fetchProphetxBalance();
  const balances = computeDualBalances(kBal, pBal);
  status.balances = balances;
  insertBalance(balances.kalshi);
  insertBalance(balances.prophetx);

  const pairs = matchMarkets(kalshiMarkets, pxMarkets);
  const opps = detectOpportunities(
    pairs,
    kalshiMarkets,
    pxMarkets,
    kBal.availableUsd,
    pBal.availableUsd,
    runtimeStrategy,
  );
  status.opportunities = opps.slice(0, 20);
  status.lastScanAt = new Date().toISOString();
  status.recentTrades = listTrades(20);

  const kFetched = kalshiMarkets[0]?.fetchedAt ?? status.lastScanAt;
  const pFetched = pxMarkets[0]?.fetchedAt ?? status.lastScanAt;

  for (const opp of opps.filter((o) => o.shouldExecute).slice(0, 1)) {
    const oppId = insertOpportunity(opp);
    const risk = evaluateRisk(opp, balances, runtimeMode, kFetched, pFetched, oppId);
    if (risk.allowed && runtimeMode !== "observe") {
      await executeOpportunity(opp, runtimeMode);
    }
  }

  for (const opp of opps.filter((o) => !o.shouldExecute).slice(0, 5)) {
    insertOpportunity(opp);
  }

  status.recentTrades = listTrades(20);
  status.opportunities = listRecentOpportunities(20);
}

export function startTycheLoop(): void {
  initTycheSchema();
  seedTycheBusiness();
  status.mode = runtimeMode;
  status.strategy = runtimeStrategy;

  void runScan().catch((err) => console.warn("Tyche initial scan failed:", err));

  if (loopTimer) clearInterval(loopTimer);
  loopTimer = setInterval(() => {
    void runScan().catch((err) => console.warn("Tyche scan failed:", err));
  }, config.tyche.scanIntervalMs);
}

export function stopTycheLoop(): void {
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
}
