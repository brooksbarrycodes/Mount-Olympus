import type { VenueId } from "./normalizedMarket.ts";

export interface VenueBalance {
  venue: VenueId;
  availableUsd: number;
  deployedUsd: number;
  totalUsd: number;
  fetchedAt: string;
}

export interface DualBalances {
  kalshi: VenueBalance;
  prophetx: VenueBalance;
  freeUsd: number;
  deployedUsd: number;
}
