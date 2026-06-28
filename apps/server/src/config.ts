import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});

/**
 * Central configuration. Everything defaults to a safe, zero-cost "mock" mode
 * so the whole system runs offline with no API keys. Flip ADAPTER_MODE to
 * "real" (and supply keys) on Day 2 to go live, one adapter at a time.
 */

export type AdapterMode = "mock" | "real";
export type TycheMode = "observe" | "paper" | "sandbox" | "live";
export type TycheStrategy = "live_only" | "static_only" | "combined";
export type KalshiEnv = "demo" | "production";
export type ProphetXEnv = "sandbox" | "production";

function str(key: string, fallback = ""): string {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}

function num(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: num("PORT", 8787),
  adapterMode: (str("ADAPTER_MODE", "mock") as AdapterMode) === "real" ? "real" : "mock",

  anthropicApiKey: str("ANTHROPIC_API_KEY"),
  models: {
    fast: str("LLM_MODEL_FAST", "claude-haiku-4-5"),
    balanced: str("LLM_MODEL_BALANCED", "claude-sonnet-4-6"),
    deep: str("LLM_MODEL_DEEP", "claude-opus-4-8"),
  },
  llmMonthlyBudgetUsd: num("LLM_MONTHLY_BUDGET_USD", 20),

  art: {
    provider: str("ART_PROVIDER"),
    apiKey: str("ART_API_KEY"),
  },
  etsy: {
    apiKey: str("ETSY_API_KEY"),
    shopId: str("ETSY_SHOP_ID"),
  },
  printifyApiKey: str("PRINTIFY_API_KEY"),
  erankApiKey: str("ERANK_API_KEY"),

  elevenlabs: {
    apiKey: str("ELEVENLABS_API_KEY"),
    zeusVoiceId: str("ZEUS_VOICE_ID", "ljo9gAlSqKOvF6D8sOsX"),
    oracleVoiceId: str("ORACLE_VOICE_ID", "HH3kybY6uEJ2ebSa9Vy3"),
    model: str("ELEVENLABS_MODEL", "eleven_flash_v2_5"),
    speed: num("ELEVENLABS_SPEED", 1.12),
  },

  treasury: {
    cursorSubscriptionUsd: num("CURSOR_SUBSCRIPTION_USD", 20),
    elevenlabsSubscriptionUsd: num("ELEVENLABS_SUBSCRIPTION_USD", 5),
    drachmaUsdRatio: num("TREASURY_DRACHMA_USD_RATIO", 1),
  },

  linear: {
    apiKey: str("LINEAR_API_KEY"),
    defaultTeamId: str("LINEAR_DEFAULT_TEAM_ID"),
  },

  tyche: {
    mode: ((): TycheMode => {
      const m = str("TYCHE_MODE", "observe");
      if (m === "paper" || m === "sandbox" || m === "live") return m;
      return "observe";
    })(),
    strategy: ((): TycheStrategy => {
      const s = str("TYCHE_STRATEGY", "static_only");
      if (s === "live_only" || s === "combined") return s;
      return "static_only";
    })(),
    autoExecution: str("TYCHE_AUTO_EXECUTION", "true") !== "false",
    maxTradeUsd: num("TYCHE_MAX_TRADE_USD", 5),
    maxDailyNotionalUsd: num("TYCHE_MAX_DAILY_NOTIONAL_USD", 50),
    minWorstCaseProfitUsd: num("TYCHE_MIN_WORST_CASE_PROFIT_USD", 0.25),
    minWorstCaseRoi: num("TYCHE_MIN_WORST_CASE_ROI", 0.01),
    maxSlippage: num("TYCHE_MAX_SLIPPAGE", 0.005),
    maxOrderbookAgeMs: num("TYCHE_MAX_ORDERBOOK_AGE_MS", 1000),
    maxLegDelayMs: num("TYCHE_MAX_LEG_DELAY_MS", 500),
    scanIntervalMs: num("TYCHE_SCAN_INTERVAL_MS", 5000),
  },

  kalshi: {
    env: (str("KALSHI_ENV", "demo") === "production" ? "production" : "demo") as KalshiEnv,
    apiKey: str("KALSHI_API_KEY"),
    apiSecret: str("KALSHI_API_SECRET"),
    demoBaseUrl: "https://demo-api.kalshi.co/trade-api/v2",
    prodBaseUrl: "https://api.elections.kalshi.com/trade-api/v2",
  },

  prophetx: {
    env: (str("PROPHETX_ENV", "sandbox") === "production" ? "production" : "sandbox") as ProphetXEnv,
    accessKey: str("PROPHETX_ACCESS_KEY"),
    secretKey: str("PROPHETX_SECRET_KEY"),
    sandboxBaseUrl: str("PROPHETX_BASE_URL", "https://api-ss-sandbox.betprophet.co/partner"),
    prodBaseUrl: "https://cash.api.prophetx.co/partner",
  },
} as const;

/** True when we should attempt real LLM calls (mode is real AND a key exists). */
export function llmIsLive(): boolean {
  return config.adapterMode === "real" && config.anthropicApiKey.length > 0;
}

/** True when ElevenLabs TTS is configured (independent of ADAPTER_MODE). */
export function ttsIsLive(): boolean {
  return config.elevenlabs.apiKey.length > 0;
}

export function kalshiIsConfigured(): boolean {
  return config.kalshi.apiKey.length > 0;
}

export function prophetxIsConfigured(): boolean {
  return config.prophetx.accessKey.length > 0 && config.prophetx.secretKey.length > 0;
}

export function kalshiBaseUrl(): string {
  return config.kalshi.env === "production" ? config.kalshi.prodBaseUrl : config.kalshi.demoBaseUrl;
}

export function prophetxBaseUrl(): string {
  return config.prophetx.env === "production"
    ? config.prophetx.prodBaseUrl
    : config.prophetx.sandboxBaseUrl;
}

/** Guardrail defaults. These are deterministic code limits, never AI-decided. */
export const guardrailDefaults = {
  /** Never publish anything below this profit margin. */
  marginFloor: 0.25,
  /** Hard ceiling on real spend the agents can incur per day (USD). */
  dailyBudgetCapUsd: 50,
  /** Max auto-publishes per day (a bug can't dump 1000 listings). */
  publishRateLimitPerDay: 25,
} as const;
