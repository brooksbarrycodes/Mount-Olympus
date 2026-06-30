import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

interface KalshiMarketRow {
  ticker?: string;
  event_ticker?: string;
  title?: string;
  /** Legacy cent integer fields */
  yes_ask?: number;
  yes_bid?: number;
  no_ask?: number;
  no_bid?: number;
  /** Current API dollar string fields (e.g. "0.5600") */
  yes_ask_dollars?: string;
  yes_bid_dollars?: string;
  no_ask_dollars?: string;
  no_bid_dollars?: string;
  close_time?: string;
  category?: string;
  subtitle?: string;
  volume?: number;
  open_interest?: number;
  volume_fp?: string;
  open_interest_fp?: string;
}

export function mapKalshiMarket(row: KalshiMarketRow): NormalizedMarket | null {
  const marketId = row.ticker ?? "";
  if (!marketId) return null;
  const yesAsk = priceToProb(row.yes_ask_dollars, row.yes_ask);
  const noAsk = priceToProb(row.no_ask_dollars, row.no_ask);
  if (yesAsk <= 0 || noAsk <= 0) return null;

  const title = row.title ?? row.subtitle ?? marketId;
  const sport = inferSport(row.category ?? title);
  const startTime = row.close_time ?? new Date().toISOString();
  const depth = parseDepth(row);

  const yesBid = priceToProb(row.yes_bid_dollars, row.yes_bid) || yesAsk - 0.01;
  const noBid = priceToProb(row.no_bid_dollars, row.no_bid) || noAsk - 0.01;

  return {
    venue: "kalshi",
    dataSource: "live" as const,
    marketId,
    eventId: row.event_ticker ?? marketId,
    eventName: title,
    sport,
    league: sport.toUpperCase(),
    marketType: "binary",
    venueMeta: { ticker: marketId },
    yesAsk,
    yesBid,
    noAsk,
    noBid,
    yesAskDepth: depth > 0 ? depth : 0,
    noAskDepth: depth > 0 ? depth : 0,
    startTime,
    isLive: new Date(startTime).getTime() <= Date.now(),
    resolutionText: title,
    overtimeIncluded: /overtime|ot/i.test(title),
    fetchedAt: new Date().toISOString(),
  };
}

/** Parse Kalshi price: prefer *_dollars string, fall back to legacy cent int. */
function priceToProb(dollars: string | undefined, cents: number | undefined): number {
  if (dollars != null && dollars !== "") {
    const n = Number.parseFloat(dollars);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return centsToProb(cents);
}

function centsToProb(v: number | undefined): number {
  if (v == null || !Number.isFinite(v)) return 0;
  if (v > 1) return v / 100;
  return v;
}

function parseDepth(row: KalshiMarketRow): number {
  if (row.volume_fp) {
    const n = Number.parseFloat(row.volume_fp);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (row.open_interest_fp) {
    const n = Number.parseFloat(row.open_interest_fp);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return row.volume ?? row.open_interest ?? 0;
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
