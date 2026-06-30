export type VenueId = "kalshi" | "prophetx";
export type BookDataSource = "live" | "mock" | "error";

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface VenueMeta {
  /** Kalshi market ticker */
  ticker?: string;
  /** ProphetX strike / line id for order placement */
  strikeId?: string;
  /** ProphetX American odds for the selected side */
  americanOdds?: number;
  yesAmericanOdds?: number;
  noAmericanOdds?: number;
}

export interface NormalizedMarket {
  venue: VenueId;
  marketId: string;
  dataSource: BookDataSource;
  venueMeta?: VenueMeta;
  eventId: string;
  eventName: string;
  sport: string;
  league: string;
  marketType: "binary";
  yesAsk: number;
  yesBid: number;
  noAsk: number;
  noBid: number;
  yesAskDepth: number;
  noAskDepth: number;
  startTime: string;
  isLive: boolean;
  resolutionText: string;
  overtimeIncluded: boolean;
  fetchedAt: string;
}

export function isMockMarket(m: NormalizedMarket): boolean {
  return m.dataSource === "mock" || m.marketId.startsWith("MOCK-") || m.marketId.startsWith("PX-MOCK");
}

export function isBinaryMarket(m: NormalizedMarket): boolean {
  return m.marketType === "binary";
}
