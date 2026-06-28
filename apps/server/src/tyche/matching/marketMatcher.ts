import type { NormalizedMarket } from "../models/normalizedMarket.ts";
import type { MatchedPair } from "../models/marketMatch.ts";
import { buildPair, eventsMatch, scoreMatch } from "./rules.ts";

export function matchMarkets(kalshi: NormalizedMarket[], px: NormalizedMarket[]): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  for (const k of kalshi) {
    for (const p of px) {
      const confidence = scoreMatch(k, p);
      if (confidence === "NOT_MATCH" || confidence === "POSSIBLE_MATCH") continue;
      const { reasons } = eventsMatch(k, p);
      pairs.push(buildPair(k, p, confidence, reasons));
    }
  }
  return pairs;
}
