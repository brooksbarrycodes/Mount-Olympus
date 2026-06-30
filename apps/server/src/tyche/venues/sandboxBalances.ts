/** Default per-venue cash for demo / design mode (Kalshi demo + ProphetX sandbox both use ~$100k). */
export const SANDBOX_VENUE_BALANCE_USD = 100_000;

export function sandboxVenueBalance(): { availableUsd: number; totalUsd: number } {
  return { availableUsd: SANDBOX_VENUE_BALANCE_USD, totalUsd: SANDBOX_VENUE_BALANCE_USD };
}
