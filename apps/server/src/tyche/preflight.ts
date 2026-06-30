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



export async function runPreflight(): Promise<PreflightResult> {

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

      error: "TYCHE_MODE=live is blocked until ProphetX engineering review and Brooks approval (see docs/tyche/RULES.md)",

    };

  }

  return { ok: true };

}


