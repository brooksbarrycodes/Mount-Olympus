import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

/** Synthetic Mets YES/NO book for UI dev when Kalshi keys are missing. */
export function mockKalshiMarkets(): NormalizedMarket[] {
  const now = new Date().toISOString();
  const start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  return [
    {
      venue: "kalshi",
      dataSource: "mock" as const,
      marketId: "MOCK-METS-WIN",
      eventId: "MOCK-METS-2026",
      eventName: "NY Mets to win vs Phillies",
      sport: "baseball",
      league: "MLB",
      marketType: "binary",
      yesAsk: 0.49,
      yesBid: 0.48,
      noAsk: 0.52,
      noBid: 0.51,
      yesAskDepth: 500,
      noAskDepth: 500,
      startTime: start,
      isLive: false,
      resolutionText: "Mets win regulation",
      overtimeIncluded: false,
      fetchedAt: now,
    },
    {
      venue: "kalshi",
      dataSource: "mock" as const,
      marketId: "MOCK-LAKERS-WIN",
      eventId: "MOCK-LAKERS-2026",
      eventName: "Lakers to win vs Celtics",
      sport: "basketball",
      league: "NBA",
      marketType: "binary",
      yesAsk: 0.55,
      yesBid: 0.54,
      noAsk: 0.46,
      noBid: 0.45,
      yesAskDepth: 300,
      noAskDepth: 300,
      startTime: start,
      isLive: false,
      resolutionText: "Lakers win including OT",
      overtimeIncluded: true,
      fetchedAt: now,
    },
  ];
}
