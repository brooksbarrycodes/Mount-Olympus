export type VenueId = "kalshi" | "prophetx";

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface NormalizedMarket {
  venue: VenueId;
  marketId: string;
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

export function isBinaryMarket(m: NormalizedMarket): boolean {
  return m.marketType === "binary";
}
