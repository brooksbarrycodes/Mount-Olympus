import type { VenueId } from "../models/normalizedMarket.ts";

export interface FeeModel {
  known: boolean;
  takerRate: number;
  makerRate: number;
}

const FEES: Record<VenueId, FeeModel> = {
  kalshi: { known: true, takerRate: 0.01, makerRate: 0.005 },
  prophetx: { known: true, takerRate: 0.01, makerRate: 0.005 },
};

export function feeForLeg(venue: VenueId, notionalUsd: number, isTaker = true): number {
  const m = FEES[venue];
  if (!m.known) return Infinity;
  return notionalUsd * (isTaker ? m.takerRate : m.makerRate);
}

export function feesKnown(venues: VenueId[]): boolean {
  return venues.every((v) => FEES[v].known);
}

export function totalFeesUsd(
  legANotional: number,
  legBNotional: number,
  venueA: VenueId,
  venueB: VenueId,
): number {
  return feeForLeg(venueA, legANotional) + feeForLeg(venueB, legBNotional);
}
