import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

interface KalshiMarketRow {
  ticker?: string;
  event_ticker?: string;
  title?: string;
  yes_ask?: number;
  yes_bid?: number;
  no_ask?: number;
  no_bid?: number;
  close_time?: string;
  category?: string;
  subtitle?: string;
}

export function mapKalshiMarket(row: KalshiMarketRow): NormalizedMarket | null {
  const marketId = row.ticker ?? "";
  if (!marketId) return null;
  const yesAsk = centsToProb(row.yes_ask);
  const noAsk = centsToProb(row.no_ask);
  if (yesAsk <= 0 || noAsk <= 0) return null;

  const title = row.title ?? row.subtitle ?? marketId;
  const sport = inferSport(row.category ?? title);
  const startTime = row.close_time ?? new Date().toISOString();

  return {
    venue: "kalshi",
    marketId,
    eventId: row.event_ticker ?? marketId,
    eventName: title,
    sport,
    league: sport.toUpperCase(),
    marketType: "binary",
    yesAsk,
    yesBid: centsToProb(row.yes_bid) || yesAsk - 0.01,
    noAsk,
    noBid: centsToProb(row.no_bid) || noAsk - 0.01,
    yesAskDepth: 100,
    noAskDepth: 100,
    startTime,
    isLive: new Date(startTime).getTime() <= Date.now(),
    resolutionText: title,
    overtimeIncluded: /overtime|ot/i.test(title),
    fetchedAt: new Date().toISOString(),
  };
}

function centsToProb(v: number | undefined): number {
  if (v == null || !Number.isFinite(v)) return 0;
  if (v > 1) return v / 100;
  return v;
}

function inferSport(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("nba") || c.includes("basketball")) return "basketball";
  if (c.includes("mlb") || c.includes("baseball")) return "baseball";
  if (c.includes("nfl") || c.includes("football")) return "football";
  if (c.includes("nhl") || c.includes("hockey")) return "hockey";
  return "other";
}

export function filterBinary(markets: NormalizedMarket[]): NormalizedMarket[] {
  return markets.filter((m) => m.marketType === "binary");
}
