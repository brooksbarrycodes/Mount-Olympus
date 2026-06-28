import type { NormalizedMarket } from "../models/normalizedMarket.ts";

/** Block pairs with resolution rule mismatches (overtime, void, advance vs win). */
export function resolutionBlocks(k: NormalizedMarket, p: NormalizedMarket): string[] {
  const blocks: string[] = [];
  if (/advance|qualify/i.test(k.resolutionText) !== /advance|qualify/i.test(p.resolutionText)) {
    blocks.push("advance vs win rule mismatch");
  }
  if (/void|cancel/i.test(k.resolutionText) !== /void|cancel/i.test(p.resolutionText)) {
    blocks.push("void rule mismatch");
  }
  return blocks;
}
