import { prophetxBaseUrl, prophetxIsConfigured, prophetxIsEnabled } from "../../../config.ts";
import { sandboxVenueBalance } from "../sandboxBalances.ts";
import { mockProphetxMarkets } from "./mock.ts";
import { inferSportFromTournament, isMajorUsSportTournament, mapProphetxMoneyline } from "./mapper.ts";
import { throttleProphetxQuery } from "./rateLimit.ts";
import { requiresLiveBooks } from "../../runtimeContext.ts";
import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

let cachedToken: string | null = null;
let cachedRefreshToken: string | null = null;
let tokenExpiresAt = 0;
let tokenRefreshFailures = 0;

const REFRESH_BEFORE_MS = 9 * 60 * 1000;
const MAX_EVENTS_PER_TOURNAMENT = 15;
const FALLBACK_TOURNAMENT_IDS = [109, 31, 132, 234]; // MLB, NFL, NBA, NHL

export interface ProphetXIngestionStats {
  tournamentsQueried: number;
  eventsFound: number;
  rawMarkets: number;
  mappedMarkets: number;
}

let lastIngestionStats: ProphetXIngestionStats = {
  tournamentsQueried: 0,
  eventsFound: 0,
  rawMarkets: 0,
  mappedMarkets: 0,
};

export function getLastProphetxIngestionStats(): ProphetXIngestionStats {
  return lastIngestionStats;
}

function tycheDebug(): boolean {
  return process.env.TYCHE_DEBUG === "1" || process.env.TYCHE_DEBUG === "true";
}

export function getProphetxTokenRefreshFailures(): number {
  return tokenRefreshFailures;
}

export function resetProphetxTokenRefreshFailures(): void {
  tokenRefreshFailures = 0;
}

export async function prophetxLogin(force = false): Promise<string | null> {
  if (!prophetxIsConfigured()) return null;
  if (!force && cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

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
    if (!res.ok) {
      tokenRefreshFailures++;
      return null;
    }
    const body = (await res.json()) as {
      data?: { access_token?: string; refresh_token?: string; expires_in?: number };
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const data = body.data ?? body;
    cachedToken = data.access_token ?? null;
    cachedRefreshToken = data.refresh_token ?? null;
    const expiresIn = (data.expires_in ?? 600) * 1000;
    tokenExpiresAt = Date.now() + Math.min(expiresIn, REFRESH_BEFORE_MS);
    tokenRefreshFailures = 0;
    return cachedToken;
  } catch {
    tokenRefreshFailures++;
    return null;
  }
}

async function prophetxRefresh(): Promise<string | null> {
  if (!cachedRefreshToken) return prophetxLogin(true);
  const url = `${prophetxBaseUrl()}/auth/refresh`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: cachedRefreshToken }),
    });
    if (!res.ok) return prophetxLogin(true);
    const body = (await res.json()) as {
      data?: { access_token?: string; refresh_token?: string; expires_in?: number };
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const data = body.data ?? body;
    cachedToken = data.access_token ?? null;
    if (data.refresh_token) cachedRefreshToken = data.refresh_token;
    const expiresIn = (data.expires_in ?? 600) * 1000;
    tokenExpiresAt = Date.now() + Math.min(expiresIn, REFRESH_BEFORE_MS);
    tokenRefreshFailures = 0;
    return cachedToken;
  } catch {
    tokenRefreshFailures++;
    return prophetxLogin(true);
  }
}

export async function prophetxEnsureToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  if (cachedRefreshToken) return prophetxRefresh();
  return prophetxLogin(true);
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function pxGet<T>(token: string, path: string, params?: Record<string, string>): Promise<T | null> {
  return throttleProphetxQuery(async () => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const url = `${prophetxBaseUrl()}${path}${qs}`;
    try {
      const res = await fetch(url, { headers: authHeaders(token) });
      if (!res.ok) {
        if (tycheDebug()) {
          const text = await res.text().catch(() => "");
          console.warn(`ProphetX GET ${path} failed (${res.status}): ${text.slice(0, 300)}`);
        }
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      if (tycheDebug()) console.warn(`ProphetX GET ${path} error:`, err);
      return null;
    }
  });
}

export async function pxPost<T>(token: string, path: string, body: unknown): Promise<T | null> {
  const url = `${prophetxBaseUrl()}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`ProphetX POST ${path} failed (${res.status}): ${text.slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`ProphetX POST ${path} error:`, err);
    return null;
  }
}

interface PxTournament {
  id?: number;
  name?: string;
}

async function discoverTournamentIds(token: string): Promise<number[]> {
  const resp = await pxGet<{ data?: { tournaments?: PxTournament[] } }>(token, "/mm/get_tournaments");
  const tournaments = resp?.data?.tournaments ?? [];
  if (tournaments.length === 0) return FALLBACK_TOURNAMENT_IDS;

  const major = tournaments.filter((t) => t.id != null && isMajorUsSportTournament(String(t.name ?? "")));
  if (major.length > 0) return major.map((t) => t.id!);

  return tournaments.filter((t) => t.id != null).slice(0, 8).map((t) => t.id!);
}

async function fetchMarketsForEvents(
  token: string,
  events: Array<Record<string, unknown>>,
): Promise<Record<string, Array<Record<string, unknown>>>> {
  if (events.length === 0) return {};

  const eventIds = events
    .slice(0, MAX_EVENTS_PER_TOURNAMENT)
    .map((e) => String(e.event_id))
    .join(",");

  const v2 = await pxGet<{ data?: Record<string, Array<Record<string, unknown>>> }>(
    token,
    "/v2/mm/get_multiple_markets",
    { event_ids: eventIds },
  );
  if (v2?.data && Object.keys(v2.data).length > 0) return v2.data;

  const v1 = await pxGet<{ data?: Record<string, Array<Record<string, unknown>>> }>(
    token,
    "/mm/get_multiple_markets",
    { event_ids: eventIds },
  );
  return v1?.data ?? {};
}

function ingestEvents(
  events: Array<Record<string, unknown>>,
  byEvent: Record<string, Array<Record<string, unknown>>>,
  out: NormalizedMarket[],
  stats: ProphetXIngestionStats,
): void {
  for (const event of events.slice(0, MAX_EVENTS_PER_TOURNAMENT)) {
    const eid = String(event.event_id);
    const markets = byEvent[eid] ?? [];
    stats.rawMarkets += markets.length;
    const sport = inferSportFromTournament(String(event.tournament_name ?? event.name ?? ""));
    for (const m of markets) {
      const mapped = mapProphetxMoneyline(
        m as Parameters<typeof mapProphetxMoneyline>[0],
        event as Parameters<typeof mapProphetxMoneyline>[1],
        sport,
      );
      if (mapped) out.push(mapped);
    }
  }
  stats.mappedMarkets = out.length;
}

export interface ProphetXHealth {
  configured: boolean;
  connected: boolean;
  status: "live" | "simulated" | "awaiting_credentials" | "disabled" | "error";
  message: string;
  dataSource: "live" | "mock" | "error";
}

export async function prophetxHealth(): Promise<ProphetXHealth> {
  if (!prophetxIsEnabled()) {
    return {
      configured: prophetxIsConfigured(),
      connected: false,
      status: requiresLiveBooks() ? "error" : "disabled",
      message: requiresLiveBooks() ? "ProphetX disabled but required for sandbox" : "ProphetX disabled",
      dataSource: "error",
    };
  }
  if (!prophetxIsConfigured()) {
    return {
      configured: false,
      connected: false,
      status: "awaiting_credentials",
      message: "Set PROPHETX_ACCESS_KEY and PROPHETX_SECRET_KEY",
      dataSource: "error",
    };
  }
  const token = await prophetxEnsureToken();
  if (!token) {
    return {
      configured: true,
      connected: false,
      status: "awaiting_credentials",
      message: "Login failed — check keys",
      dataSource: "error",
    };
  }
  const bal = await pxGet<{ data?: { balance?: number } }>(token, "/mm/get_balance");
  return {
    configured: true,
    connected: true,
    status: "live",
    message: bal ? "Authenticated" : "Authenticated (balance unavailable)",
    dataSource: "live",
  };
}

export async function fetchProphetxMarkets(kalshiMarkets: NormalizedMarket[]): Promise<NormalizedMarket[]> {
  const liveRequired = requiresLiveBooks();

  if (!prophetxIsEnabled() || !prophetxIsConfigured()) {
    if (liveRequired) return [];
    return mockProphetxMarkets(kalshiMarkets);
  }
  const token = await prophetxEnsureToken();
  if (!token) {
    if (liveRequired) return [];
    return mockProphetxMarkets(kalshiMarkets);
  }

  const stats: ProphetXIngestionStats = {
    tournamentsQueried: 0,
    eventsFound: 0,
    rawMarkets: 0,
    mappedMarkets: 0,
  };
  const out: NormalizedMarket[] = [];
  const tournamentIds = await discoverTournamentIds(token);
  stats.tournamentsQueried = tournamentIds.length;

  for (const tournamentId of tournamentIds) {
    const eventsResp = await pxGet<{
      data?: { sport_events?: Array<Record<string, unknown>> };
    }>(token, "/mm/get_sport_events", { tournament_id: String(tournamentId) });
    const events = eventsResp?.data?.sport_events ?? [];
    if (events.length === 0) continue;

    stats.eventsFound += events.length;
    const byEvent = await fetchMarketsForEvents(token, events);
    ingestEvents(events, byEvent, out, stats);
  }

  lastIngestionStats = stats;

  if (out.length === 0) {
    if (liveRequired) return [];
    return mockProphetxMarkets(kalshiMarkets);
  }
  return out;
}

export async function fetchProphetxBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
  if (!prophetxIsEnabled() || !prophetxIsConfigured()) {
    if (requiresLiveBooks()) throw new Error("ProphetX not configured");
    return sandboxVenueBalance();
  }
  const token = await prophetxEnsureToken();
  if (!token) {
    if (requiresLiveBooks()) throw new Error("ProphetX login failed");
    return sandboxVenueBalance();
  }

  const resp = await pxGet<{ data?: { balance?: number } }>(token, "/mm/get_balance");
  const bal = resp?.data?.balance;
  if (bal == null || !Number.isFinite(bal)) {
    if (requiresLiveBooks()) throw new Error("ProphetX balance unavailable");
    return sandboxVenueBalance();
  }
  return { availableUsd: bal, totalUsd: bal };
}

/** Pusher WS skeleton — disabled until configured. */
export function connectProphetxWs(_onBook: (m: NormalizedMarket) => void): { close: () => void } {
  return { close: () => {} };
}

export { pxGet };
