import type { VenueId } from "./normalizedMarket.ts";

export type MatchConfidence = "EXACT_MATCH" | "PROBABLE_MATCH" | "POSSIBLE_MATCH" | "NOT_MATCH";

export interface MarketMatch {
  id?: number;
  kalshiMarketId: string;
  prophetxMarketId: string;
  confidence: MatchConfidence;
  reasons: string[];
  kalshiEventName: string;
  prophetxEventName: string;
  sport: string;
  createdAt?: string;
}

export interface MatchedPair {
  kalshiMarketId: string;
  prophetxMarketId: string;
  confidence: MatchConfidence;
  reasons: string[];
  eventName: string;
  sport: string;
  legA: { venue: VenueId; side: "yes" | "no" };
  legB: { venue: VenueId; side: "yes" | "no" };
}
