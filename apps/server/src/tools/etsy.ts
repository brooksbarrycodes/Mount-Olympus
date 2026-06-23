import { config } from "../config.ts";

/**
 * Etsy + print-on-demand. On Day 2 this creates real Etsy DRAFT listings and
 * links a Printify product. Even live, it only ever creates DRAFTS - publishing
 * goes through the approval queue. Mock returns a fake draft id offline.
 */

export interface EtsyDraft {
  draftId: string;
  title: string;
  price: number;
  /** All-in cost estimate (POD item + Etsy fees) in USD. */
  estimatedCost: number;
  note: string;
}

/** Rough POD + Etsy fee model so the ledger/guardrails have a real cost to use. */
function estimateCost(price: number): number {
  const podItemCost = 8.5; // typical poster blank + print
  const etsyFees = price * 0.1 + 0.2; // transaction + payment + listing
  return Math.round((podItemCost + etsyFees) * 100) / 100;
}

export async function createEtsyDraft(input: {
  title: string;
  price: number;
  description?: string;
  tags?: string[];
  imageUrl?: string;
}): Promise<EtsyDraft> {
  if (config.adapterMode === "real") {
    if (!config.etsy.apiKey || !config.etsy.shopId) {
      throw new Error("Etsy not configured. Set ETSY_API_KEY and ETSY_SHOP_ID on Day 2.");
    }
    throw new Error("Etsy real adapter not yet implemented.");
  }
  const draftId = `draft-${Math.random().toString(36).slice(2, 8)}`;
  return {
    draftId,
    title: input.title,
    price: input.price,
    estimatedCost: estimateCost(input.price),
    note: "Mock Etsy draft (not published). Configure Etsy + Printify on Day 2.",
  };
}
