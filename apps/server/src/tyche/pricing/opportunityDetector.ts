import type { NormalizedMarket } from "../models/normalizedMarket.ts";
import type { MatchedPair } from "../models/marketMatch.ts";
import type { Opportunity } from "../models/opportunity.ts";
import { calculateOpportunity, rankOpportunities } from "./bundleCalculator.ts";
import { resolutionBlocks } from "../matching/resolutionChecker.ts";

export function detectOpportunities(
  pairs: MatchedPair[],
  kalshiMarkets: NormalizedMarket[],
  pxMarkets: NormalizedMarket[],
  balanceKalshi: number,
  balancePx: number,
  strategy: string,
): Opportunity[] {
  const kMap = new Map(kalshiMarkets.map((m) => [m.marketId, m]));
  const pMap = new Map(pxMarkets.map((m) => [m.marketId, m]));
  const opps: Opportunity[] = [];

  for (const pair of pairs) {
    const k = kMap.get(pair.kalshiMarketId);
    const p = pMap.get(pair.prophetxMarketId);
    if (!k || !p) continue;
    const blocks = resolutionBlocks(k, p);
    if (blocks.length > 0) continue;
    const opp = calculateOpportunity({
      pair,
      kalshi: k,
      px: p,
      balanceKalshi,
      balancePx,
      strategy,
    });
    if (blocks.length) opp.rejectionReasons.push(...blocks);
    opps.push(opp);
  }
  return rankOpportunities(opps);
}
