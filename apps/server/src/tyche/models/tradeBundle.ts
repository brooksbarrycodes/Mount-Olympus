import type { VenueId } from "./normalizedMarket.ts";

export type TradeStatus = "pending" | "success" | "failed";
export type LegStatus = "pending" | "partial" | "filled" | "cancelled" | "failed";

export interface TradeLeg {
  id?: number;
  tradeId?: number;
  venue: VenueId;
  marketId: string;
  side: "yes" | "no";
  price: number;
  quantity: number;
  orderId: string | null;
  status: LegStatus;
  filledQty: number;
  feeUsd: number;
}

export interface TradeBundle {
  id?: number;
  status: TradeStatus;
  strategy: string;
  eventName: string;
  sport: string;
  matchConfidence: string;
  lockedProfitUsd: number;
  actualPnlUsd: number | null;
  failureReason: string | null;
  legs: TradeLeg[];
  createdAt?: string;
  settledAt?: string | null;
}
