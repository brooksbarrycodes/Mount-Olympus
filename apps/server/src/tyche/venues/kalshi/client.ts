import { kalshiIsConfigured } from "../../../config.ts";
import { kalshiAuthHeaders, kalshiApiPath } from "./auth.ts";
import { mapKalshiMarket, filterBinary } from "./mapper.ts";
import { mockKalshiMarkets } from "./mock.ts";
import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

export interface KalshiHealth {
  configured: boolean;
  connected: boolean;
  mode: "live" | "mock";
  message: string;
  marketCount: number;
}

export async function fetchKalshiMarkets(): Promise<NormalizedMarket[]> {
  if (!kalshiIsConfigured()) return mockKalshiMarkets();

  try {
    const path = "/markets?limit=50&status=open";
    const url = kalshiApiPath(path);
    const res = await fetch(url, { headers: kalshiAuthHeaders("GET", path) });
    if (!res.ok) {
      console.warn(`Kalshi markets fetch failed (${res.status}), using mock`);
      return mockKalshiMarkets();
    }
    const data = (await res.json()) as { markets?: unknown[] };
    const mapped = (data.markets ?? [])
      .map((m) => mapKalshiMarket(m as Parameters<typeof mapKalshiMarket>[0]))
      .filter((m): m is NormalizedMarket => m != null);
    return filterBinary(mapped.length > 0 ? mapped : mockKalshiMarkets());
  } catch (err) {
    console.warn("Kalshi fetch error, using mock:", err);
    return mockKalshiMarkets();
  }
}

export async function fetchKalshiBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
  if (!kalshiIsConfigured()) return { availableUsd: 100, totalUsd: 100 };

  try {
    const path = "/portfolio/balance";
    const url = kalshiApiPath(path);
    const res = await fetch(url, { headers: kalshiAuthHeaders("GET", path) });
    if (!res.ok) return { availableUsd: 100, totalUsd: 100 };
    const data = (await res.json()) as { balance?: number };
    const cents = data.balance ?? 10000;
    const usd = cents / 100;
    return { availableUsd: usd, totalUsd: usd };
  } catch {
    return { availableUsd: 100, totalUsd: 100 };
  }
}

export async function kalshiHealth(): Promise<KalshiHealth> {
  const configured = kalshiIsConfigured();
  if (!configured) {
    const mock = mockKalshiMarkets();
    return {
      configured: false,
      connected: true,
      mode: "mock",
      message: "Using mock Kalshi books (no API key)",
      marketCount: mock.length,
    };
  }
  const markets = await fetchKalshiMarkets();
  return {
    configured: true,
    connected: markets.length > 0,
    mode: "live",
    message: markets.some((m) => m.marketId.startsWith("MOCK-")) ? "API fallback to mock" : "Connected",
    marketCount: markets.length,
  };
}

/** WebSocket skeleton — connect after REST is stable. */
export function connectKalshiWs(_onBook: (m: NormalizedMarket) => void): { close: () => void } {
  return { close: () => {} };
}
