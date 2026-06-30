import { config, kalshiIsConfigured, prophetxIsConfigured, prophetxIsEnabled } from "../config.ts";
import {
  fetchKalshiMarkets,
  fetchKalshiBalance,
  kalshiHealth,
  getLastKalshiIngestionStats,
} from "./venues/kalshi/client.ts";
import {
  fetchProphetxMarkets,
  fetchProphetxBalance,
  prophetxHealth,
  getLastProphetxIngestionStats,
} from "./venues/prophetx/client.ts";
import { isMockMarket } from "./models/normalizedMarket.ts";
import { getRuntimeMode, setRuntimeMode } from "./runtimeContext.ts";
import type { TycheMode } from "../config.ts";

export interface PreflightVenueDiagnostics {
  dataSource: "live" | "mock" | "error";
  message: string;
  marketCount: number;
  rawCount?: number;
  mappedCount?: number;
  tournamentsQueried?: number;
  eventsFound?: number;
}

export interface PreflightResult {
  ready: boolean;
  /** Mode the desk session will run in when started. */
  sessionMode: TycheMode;
  reasons: string[];
  kalshi: Awaited<ReturnType<typeof kalshiHealth>>;
  prophetx: Awaited<ReturnType<typeof prophetxHealth>>;
  kalshiMarkets: number;
  prophetxMarkets: number;
  diagnostics: {
    kalshi: PreflightVenueDiagnostics;
    prophetx: PreflightVenueDiagnostics;
  };
}

export function venuesReadyForSandbox(): boolean {
  return kalshiIsConfigured() && prophetxIsEnabled() && prophetxIsConfigured();
}

export async function runPreflight(): Promise<PreflightResult> {
  if (config.tyche.mode === "paper" || !venuesReadyForSandbox()) {
    const notes: string[] = [];
    if (config.tyche.mode === "sandbox" && !venuesReadyForSandbox()) {
      notes.push(
        "Venue API keys not configured — session runs in PAPER mode with mock books. Add Kalshi + ProphetX keys to apps/server/.env for real sandbox.",
      );
    }
    return runPaperPreflight(notes);
  }
  return runSandboxPreflight();
}

async function runPaperPreflight(notes: string[]): Promise<PreflightResult> {
  const prevMode = getRuntimeMode();
  setRuntimeMode("paper");

  try {
    const [kHealth, pHealth] = await Promise.all([kalshiHealth(), prophetxHealth()]);
    const kalshiMarkets = await fetchKalshiMarkets();
    const pxMarkets = await fetchProphetxMarkets(kalshiMarkets);
    const mockKalshi = kalshiMarkets.filter((m) => isMockMarket(m));
    const mockPx = pxMarkets.filter((m) => isMockMarket(m));

    return {
      ready: mockKalshi.length > 0 && mockPx.length > 0,
      sessionMode: "paper",
      reasons:
        mockKalshi.length > 0 && mockPx.length > 0
          ? notes
          : [...notes, "Mock venue books failed to load"],
      kalshi: kHealth,
      prophetx: pHealth,
      kalshiMarkets: mockKalshi.length,
      prophetxMarkets: mockPx.length,
      diagnostics: {
        kalshi: {
          dataSource: kHealth.dataSource,
          message: kHealth.message,
          marketCount: mockKalshi.length,
          mappedCount: mockKalshi.length,
        },
        prophetx: {
          dataSource: pHealth.dataSource,
          message: pHealth.message,
          marketCount: mockPx.length,
          mappedCount: mockPx.length,
        },
      },
    };
  } finally {
    setRuntimeMode(prevMode);
  }
}

async function runSandboxPreflight(): Promise<PreflightResult> {
  const reasons: string[] = [];
  const prevMode = getRuntimeMode();
  setRuntimeMode("sandbox");

  try {
    if (config.kalshi.env !== "demo") reasons.push("KALSHI_ENV must be demo (no real money)");
    if (config.prophetx.env !== "sandbox") reasons.push("PROPHETX_ENV must be sandbox");
    if (!kalshiIsConfigured()) reasons.push("Kalshi API keys missing");
    if (!prophetxIsEnabled()) reasons.push("PROPHETX_ENABLED must be true");
    if (!prophetxIsConfigured()) reasons.push("ProphetX API keys missing");

    const [kHealth, pHealth] = await Promise.all([kalshiHealth(), prophetxHealth()]);
    const kalshiMarkets = await fetchKalshiMarkets();
    const pxMarkets = await fetchProphetxMarkets(kalshiMarkets);
    const kStats = getLastKalshiIngestionStats();
    const pxStats = getLastProphetxIngestionStats();

    if (kHealth.dataSource !== "live") reasons.push(`Kalshi books not live (${kHealth.message})`);
    if (pHealth.dataSource !== "live") reasons.push(`ProphetX books not live (${pHealth.message})`);

    const liveKalshi = kalshiMarkets.filter((m) => !isMockMarket(m));
    const livePx = pxMarkets.filter((m) => !isMockMarket(m));

    if (liveKalshi.length === 0) {
      reasons.push(
        kStats.rawCount > 0
          ? `No live Kalshi markets returned (${kStats.mappedCount}/${kStats.rawCount} mapped)`
          : "No live Kalshi markets returned",
      );
    }
    if (livePx.length === 0) {
      if (pxStats.eventsFound === 0 && pHealth.dataSource === "live") {
        reasons.push(
          "ProphetX sandbox has no open sport events — email anthony.fradella@prophetexchange.com to enable/seed markets",
        );
      } else if (pxStats.rawMarkets > 0) {
        reasons.push(
          `No live ProphetX markets returned (${pxStats.mappedMarkets}/${pxStats.rawMarkets} mapped from ${pxStats.eventsFound} events)`,
        );
      } else {
        reasons.push("No live ProphetX markets returned");
      }
    }

    try {
      await fetchKalshiBalance();
    } catch (e) {
      reasons.push(`Kalshi balance: ${String(e)}`);
    }
    try {
      await fetchProphetxBalance();
    } catch (e) {
      reasons.push(`ProphetX balance: ${String(e)}`);
    }

    return {
      ready: reasons.length === 0,
      sessionMode: "sandbox",
      reasons,
      kalshi: kHealth,
      prophetx: pHealth,
      kalshiMarkets: liveKalshi.length,
      prophetxMarkets: livePx.length,
      diagnostics: {
        kalshi: {
          dataSource: kHealth.dataSource,
          message: kHealth.message,
          marketCount: liveKalshi.length,
          rawCount: kStats.rawCount,
          mappedCount: kStats.mappedCount,
        },
        prophetx: {
          dataSource: pHealth.dataSource,
          message: pHealth.message,
          marketCount: livePx.length,
          rawCount: pxStats.rawMarkets,
          mappedCount: pxStats.mappedMarkets,
          tournamentsQueried: pxStats.tournamentsQueried,
          eventsFound: pxStats.eventsFound,
        },
      },
    };
  } finally {
    setRuntimeMode(prevMode);
  }
}

export function blockLiveMode(mode: string): { ok: false; error: string } | { ok: true } {
  if (mode === "live") {
    return {
      ok: false,
      error:
        "TYCHE_MODE=live is blocked until ProphetX engineering review and Brooks approval (see docs/tyche/RULES.md)",
    };
  }
  return { ok: true };
}
