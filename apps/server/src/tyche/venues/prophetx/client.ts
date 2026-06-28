import { prophetxBaseUrl, prophetxIsConfigured } from "../../../config.ts";
import { mockProphetxMarkets } from "./mock.ts";
import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function prophetxLogin(): Promise<string | null> {
  if (!prophetxIsConfigured()) return null;
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const { config } = await import("../../../config.ts");
  const url = `${prophetxBaseUrl()}/auth/login`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: config.prophetx.accessKey,
        secret_key: config.prophetx.secretKey,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    cachedToken = data.access_token ?? null;
    tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000;
    return cachedToken;
  } catch {
    return null;
  }
}

export interface ProphetXHealth {
  configured: boolean;
  connected: boolean;
  status: "live" | "simulated" | "awaiting_credentials";
  message: string;
}

export async function prophetxHealth(): Promise<ProphetXHealth> {
  if (!prophetxIsConfigured()) {
    return {
      configured: false,
      connected: false,
      status: "awaiting_credentials",
      message: "Set PROPHETX_ACCESS_KEY and PROPHETX_SECRET_KEY",
    };
  }
  const token = await prophetxLogin();
  return {
    configured: true,
    connected: token != null,
    status: token ? "live" : "awaiting_credentials",
    message: token ? "Authenticated" : "Login failed — check keys",
  };
}

export async function fetchProphetxMarkets(kalshiMarkets: NormalizedMarket[]): Promise<NormalizedMarket[]> {
  if (!prophetxIsConfigured()) return mockProphetxMarkets(kalshiMarkets);
  const token = await prophetxLogin();
  if (!token) return mockProphetxMarkets(kalshiMarkets);
  // Skeleton: real market fetch when API paths are confirmed
  return mockProphetxMarkets(kalshiMarkets);
}

export async function fetchProphetxBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
  if (!prophetxIsConfigured()) return { availableUsd: 100, totalUsd: 100 };
  return { availableUsd: 100, totalUsd: 100 };
}

/** Pusher WS skeleton — disabled until configured. */
export function connectProphetxWs(_onBook: (m: NormalizedMarket) => void): { close: () => void } {
  return { close: () => {} };
}
