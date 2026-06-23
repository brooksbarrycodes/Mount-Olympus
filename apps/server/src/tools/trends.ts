import { config } from "../config.ts";

/**
 * Trend signals for the Oracle. Free-tier sources (Google Trends, Pinterest
 * Trends) plug in here on Day 2. Until then, deterministic mock data lets the
 * Oracle reason end to end.
 */

export interface TrendResult {
  source: string;
  category: string;
  rising: string[];
  cooling: string[];
  note: string;
}

const RISING_BY_CATEGORY: Record<string, string[]> = {
  "wall art": [
    "minimalist line-art portraits",
    "cottagecore botanical prints",
    "retro travel posters",
    "celestial / star-map art",
  ],
  stickers: ["matte die-cut quote stickers", "kawaii animal packs", "vinyl laptop kits"],
  default: ["minimalist line-art portraits", "vintage botanical prints", "abstract shapes"],
};

const COOLING_BY_CATEGORY: Record<string, string[]> = {
  "wall art": ["live-laugh-love typography", "generic motivational quotes"],
  stickers: ["holographic unicorns"],
  default: ["overdone inspirational quotes"],
};

function mockTrend(source: string, category: string): TrendResult {
  const key = category.toLowerCase();
  return {
    source,
    category,
    rising: RISING_BY_CATEGORY[key] ?? RISING_BY_CATEGORY.default,
    cooling: COOLING_BY_CATEGORY[key] ?? COOLING_BY_CATEGORY.default,
    note: `${source} mock signal for "${category}". Configure real trend access on Day 2.`,
  };
}

export async function googleTrends(category: string): Promise<TrendResult> {
  if (config.adapterMode === "real") {
    // Day 2: wire pytrends-style access or a trends API here.
    throw new Error("Google Trends real adapter not configured. Set up on Day 2.");
  }
  return mockTrend("Google Trends", category);
}

export async function pinterestTrends(category: string): Promise<TrendResult> {
  if (config.adapterMode === "real") {
    throw new Error("Pinterest Trends real adapter not configured. Set up on Day 2.");
  }
  return mockTrend("Pinterest Trends", category);
}
