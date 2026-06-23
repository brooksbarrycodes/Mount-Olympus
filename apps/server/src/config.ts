import "dotenv/config";

/**
 * Central configuration. Everything defaults to a safe, zero-cost "mock" mode
 * so the whole system runs offline with no API keys. Flip ADAPTER_MODE to
 * "real" (and supply keys) on Day 2 to go live, one adapter at a time.
 */

export type AdapterMode = "mock" | "real";

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
} as const;

/** True when we should attempt real LLM calls (mode is real AND a key exists). */
export function llmIsLive(): boolean {
  return config.adapterMode === "real" && config.anthropicApiKey.length > 0;
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
