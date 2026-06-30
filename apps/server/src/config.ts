import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  env,
  envBool,
  envNum,
  normalizePem,
  vercelClaudeKeyPresent,
  vercelTycheKeysPresent,
} from "./env.ts";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});

/**
 * Central configuration. Everything defaults to a safe, zero-cost "mock" mode
 * so the whole system runs offline with no API keys. Flip ADAPTER_MODE to
 * "real" (and supply keys) on Day 2 to go live, one adapter at a time.
 *
 * Vercel dashboard names (PascalCase) are accepted as aliases — see env.ts.
 */

export type AdapterMode = "mock" | "real";
export type TycheMode = "observe" | "paper" | "sandbox" | "live";
export type TycheStrategy = "live_only" | "static_only" | "combined";
export type KalshiEnv = "demo" | "production";
export type ProphetXEnv = "sandbox" | "production";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tycheVenueKeysReady = vercelTycheKeysPresent();

export const config = {
  port: envNum("PORT", 8787),
  adapterMode: ((): AdapterMode => {
    const explicit = env("ADAPTER_MODE");
    if (explicit === "real") return "real";
    if (explicit === "mock") return "mock";
    if (vercelClaudeKeyPresent()) return "real";
    return "mock";
  })(),

  anthropicApiKey: env("ANTHROPIC_API_KEY", "ClaudeAPIKey"),
  models: {
    fast: env("LLM_MODEL_FAST") || "claude-haiku-4-5",
    balanced: env("LLM_MODEL_BALANCED") || "claude-sonnet-4-6",
    deep: env("LLM_MODEL_DEEP") || "claude-opus-4-8",
  },
  llmMonthlyBudgetUsd: envNum("LLM_MONTHLY_BUDGET_USD", 20),

  art: {
    provider: env("ART_PROVIDER"),
    apiKey: env("ART_API_KEY"),
  },
  etsy: {
    apiKey: env("ETSY_API_KEY"),
    shopId: env("ETSY_SHOP_ID"),
  },
  printifyApiKey: env("PRINTIFY_API_KEY"),
  erankApiKey: env("ERANK_API_KEY"),

  elevenlabs: {
    apiKey: env("ELEVENLABS_API_KEY", "ElevenLabsAPIKey"),
    zeusVoiceId: env("ZEUS_VOICE_ID") || "ljo9gAlSqKOvF6D8sOsX",
    oracleVoiceId: env("ORACLE_VOICE_ID") || "HH3kybY6uEJ2ebSa9Vy3",
    model: env("ELEVENLABS_MODEL") || "eleven_flash_v2_5",
    speed: envNum("ELEVENLABS_SPEED", 1.12),
  },

  treasury: {
    cursorSubscriptionUsd: envNum("CURSOR_SUBSCRIPTION_USD", 20),
    elevenlabsSubscriptionUsd: envNum("ELEVENLABS_SUBSCRIPTION_USD", 5),
    drachmaUsdRatio: envNum("TREASURY_DRACHMA_USD_RATIO", 1),
  },

  linear: {
    apiKey: env("LINEAR_API_KEY"),
    defaultTeamId: env("LINEAR_DEFAULT_TEAM_ID"),
  },

  tyche: {
    autoScan: envBool("TYCHE_AUTO_SCAN", tycheVenueKeysReady),
    mode: ((): TycheMode => {
      const m = env("TYCHE_MODE");
      if (m === "paper" || m === "sandbox" || m === "live") return m;
      if (tycheVenueKeysReady) return "sandbox";
      return "observe";
    })(),
    strategy: ((): TycheStrategy => {
      const s = env("TYCHE_STRATEGY");
      if (s === "live_only" || s === "combined") return s;
      return "static_only";
    })(),
    autoExecution: env("TYCHE_AUTO_EXECUTION") !== "false",
    maxTradeUsd: envNum("TYCHE_MAX_TRADE_USD", 5),
    maxDailyNotionalUsd: envNum("TYCHE_MAX_DAILY_NOTIONAL_USD", 50),
    minWorstCaseProfitUsd: envNum("TYCHE_MIN_WORST_CASE_PROFIT_USD", 0.25),
    minWorstCaseRoi: envNum("TYCHE_MIN_WORST_CASE_ROI", 0.01),
    maxSlippage: envNum("TYCHE_MAX_SLIPPAGE", 0.005),
    maxOrderbookAgeMs: envNum("TYCHE_MAX_ORDERBOOK_AGE_MS", 1000),
    maxLegDelayMs: envNum("TYCHE_MAX_LEG_DELAY_MS", 500),
    scanIntervalMs: envNum("TYCHE_SCAN_INTERVAL_MS", 12000),
    sessionMaxDurationMs: envNum("TYCHE_SESSION_MAX_DURATION_MS", 18_000_000),
    sessionMaxOrders: envNum("TYCHE_SESSION_MAX_ORDERS", 50),
    sessionMaxNotionalUsd: envNum("TYCHE_SESSION_MAX_NOTIONAL_USD", 500),
  },

  kalshi: {
    env: (env("KALSHI_ENV", "demo") === "production" ? "production" : "demo") as KalshiEnv,
    /** Key ID from Kalshi Profile → API Keys (KALSHI-ACCESS-KEY header). */
    apiKey: env("KALSHI_API_KEY", "KalshiDemoKey"),
    /** @deprecated HMAC secret — Kalshi now uses RSA. Use KALSHI_PRIVATE_KEY_PATH instead. */
    apiSecret: env("KALSHI_API_SECRET"),
    /** Path to downloaded *.pem (local dev). Relative paths resolve from apps/server/. */
    privateKeyPath: ((): string => {
      const p = env("KALSHI_PRIVATE_KEY_PATH");
      if (!p) return "";
      return path.isAbsolute(p) ? p : path.resolve(serverRoot, p);
    })(),
    /** Inline PEM — use KalshiDemoPrivateKey on Vercel (\\n for newlines). */
    privateKeyPem: normalizePem(env("KALSHI_PRIVATE_KEY", "KalshiDemoPrivateKey")),
    demoBaseUrl: "https://demo-api.kalshi.co/trade-api/v2",
    prodBaseUrl: "https://api.elections.kalshi.com/trade-api/v2",
  },

  prophetx: {
    enabled: envBool("PROPHETX_ENABLED", tycheVenueKeysReady),
    env: (env("PROPHETX_ENV", "sandbox") === "production" ? "production" : "sandbox") as ProphetXEnv,
    accessKey: env("PROPHETX_ACCESS_KEY", "ProphetXSandboxAccessKey"),
    secretKey: env("PROPHETX_SECRET_KEY", "ProphetXSandboxSecretKey"),
    sandboxBaseUrl: env("PROPHETX_BASE_URL") || "https://api-ss-sandbox.betprophet.co/partner",
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
  const hasKey = config.kalshi.apiKey.length > 0;
  const hasPrivate =
    config.kalshi.privateKeyPath.length > 0 || config.kalshi.privateKeyPem.length > 0;
  return hasKey && hasPrivate;
}

export function prophetxIsConfigured(): boolean {
  return config.prophetx.accessKey.length > 0 && config.prophetx.secretKey.length > 0;
}

export function prophetxIsEnabled(): boolean {
  return config.prophetx.enabled;
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
