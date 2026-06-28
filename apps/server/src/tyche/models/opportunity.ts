import type { VenueId } from "./normalizedMarket.ts";
import type { MatchConfidence } from "./marketMatch.ts";

export interface OpportunityLeg {
  venue: VenueId;
  marketId: string;
  side: "yes" | "no";
  askPrice: number;
  depth: number;
}

export interface Opportunity {
  id?: number;
  eventName: string;
  sport: string;
  strategyTag: "live" | "static";
  matchConfidence: MatchConfidence;
  legA: OpportunityLeg;
  legB: OpportunityLeg;
  bundleCost: number;
  grossEdge: number;
  netEdge: number;
  worstCaseProfitUsd: number;
  worstCaseRoi: number;
  maxSize: number;
  priorityScore: number;
  shouldExecute: boolean;
  rejectionReasons: string[];
  createdAt?: string;
}
