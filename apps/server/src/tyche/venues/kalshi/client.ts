import { kalshiIsConfigured } from "../../../config.ts";
import { kalshiAuthHeaders, kalshiApiPath } from "./auth.ts";
import { mapKalshiMarket, filterBinary } from "./mapper.ts";
import { sandboxVenueBalance } from "../sandboxBalances.ts";
import { mockKalshiMarkets } from "./mock.ts";
import { requiresLiveBooks } from "../../runtimeContext.ts";
import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

export interface KalshiHealth {
  configured: boolean;
  connected: boolean;
  mode: "live" | "mock" | "error";
  message: string;
  marketCount: number;
  dataSource: "live" | "mock" | "error";
  rawCount?: number;
  mappedCount?: number;
}

export interface KalshiIngestionStats {
  rawCount: number;
  mappedCount: number;
}

let lastKalshiIngestionStats: KalshiIngestionStats = { rawCount: 0, mappedCount: 0 };

export function getLastKalshiIngestionStats(): KalshiIngestionStats {
  return lastKalshiIngestionStats;
}

export async function fetchKalshiMarkets(): Promise<NormalizedMarket[]> {
  const liveRequired = requiresLiveBooks();

  if (!kalshiIsConfigured()) {
    if (liveRequired) return [];
    return mockKalshiMarkets();
  }

  try {
    const path = "/markets?limit=50&status=open";
    const url = kalshiApiPath(path);
    const res = await fetch(url, { headers: kalshiAuthHeaders("GET", path) });
    if (!res.ok) {
      console.warn(`Kalshi markets fetch failed (${res.status})`);
      if (liveRequired) return [];
      return mockKalshiMarkets();
    }
    const data = (await res.json()) as { markets?: unknown[] };
    const rawCount = data.markets?.length ?? 0;
    const mapped = (data.markets ?? [])
      .map((m) => mapKalshiMarket(m as Parameters<typeof mapKalshiMarket>[0]))
      .filter((m): m is NormalizedMarket => m != null);
    const filtered = filterBinary(mapped);
    lastKalshiIngestionStats = { rawCount, mappedCount: filtered.length };
    if (filtered.length === 0) {
      if (liveRequired) return [];
      return mockKalshiMarkets();
    }
    return filtered;
  } catch (err) {
    console.warn("Kalshi fetch error:", err);
    if (liveRequired) return [];
    return mockKalshiMarkets();
  }
}

export async function fetchKalshiBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
  if (!kalshiIsConfigured()) {
    if (requiresLiveBooks()) throw new Error("Kalshi not configured");
    return sandboxVenueBalance();
  }

  try {
    const path = "/portfolio/balance";
    const url = kalshiApiPath(path);
    const res = await fetch(url, { headers: kalshiAuthHeaders("GET", path) });
    if (!res.ok) {
      if (requiresLiveBooks()) throw new Error(`Kalshi balance failed (${res.status})`);
      return sandboxVenueBalance();
    }
    const data = (await res.json()) as { balance?: number };
    const cents = data.balance ?? 10000;
    const usd = cents / 100;
    return { availableUsd: usd, totalUsd: usd };
  } catch (err) {
    if (requiresLiveBooks()) throw err;
    return sandboxVenueBalance();
  }
}

export async function kalshiHealth(): Promise<KalshiHealth> {
  const configured = kalshiIsConfigured();
  if (!configured) {
    if (requiresLiveBooks()) {
      return {
        configured: false,
        connected: false,
        mode: "error",
        message: "Kalshi keys missing (required for sandbox)",
        marketCount: 0,
        dataSource: "error",
      };
    }
    const mock = mockKalshiMarkets();
    return {
      configured: false,
      connected: true,
      mode: "mock",
      message: "Using mock Kalshi books (no API key)",
      marketCount: mock.length,
      dataSource: "mock",
    };
  }
  const markets = await fetchKalshiMarkets();
  const stats = getLastKalshiIngestionStats();
  const mock = markets.some((m) => m.dataSource === "mock");
  return {
    configured: true,
    connected: markets.length > 0,
    mode: mock ? "mock" : markets.length > 0 ? "live" : "error",
    message:
      markets.length === 0
        ? stats.rawCount > 0
          ? `No mappable markets (${stats.mappedCount}/${stats.rawCount} mapped)`
          : "No markets returned"
        : mock
          ? "API fallback to mock"
          : "Connected",
    marketCount: markets.length,
    dataSource: mock ? "mock" : markets.length > 0 ? "live" : "error",
    rawCount: stats.rawCount,
    mappedCount: stats.mappedCount,
  };
}

/** WebSocket skeleton — connect after REST is stable. */
export function connectKalshiWs(_onBook: (m: NormalizedMarket) => void): { close: () => void } {
  return { close: () => {} };
}
