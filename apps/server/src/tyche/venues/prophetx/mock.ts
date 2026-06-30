import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

/** Simulated ProphetX leg for paper mode when keys are missing. */
export function mockProphetxMarkets(kalshiMarkets: NormalizedMarket[]): NormalizedMarket[] {
  const now = new Date().toISOString();
  return kalshiMarkets.map((k) => {
    const pxId = k.marketId.replace("MOCK-", "PX-");
    return {
      venue: "prophetx" as const,
      dataSource: "mock" as const,
      marketId: pxId,
      eventId: `PX-${k.eventId}`,
      eventName: k.eventName.replace(" to win", ""),
      sport: k.sport,
      league: k.league,
      marketType: "binary" as const,
      yesAsk: 0.52,
      yesBid: 0.51,
      noAsk: 0.49,
      noBid: 0.48,
      yesAskDepth: k.yesAskDepth,
      noAskDepth: k.noAskDepth,
      startTime: k.startTime,
      isLive: k.isLive,
      resolutionText: k.resolutionText,
      overtimeIncluded: k.overtimeIncluded,
      fetchedAt: now,
    };
  });
}
