import { config } from "../config.ts";

/**
 * Apollo's art generator. On Day 2 this calls Leonardo / Ideogram / Stability /
 * local SD (per ART_PROVIDER). The mock returns a deterministic placeholder so
 * the full create-listing flow works offline.
 */

export interface GeneratedArt {
  prompt: string;
  imageUrl: string;
  width: number;
  height: number;
  /** Estimated generation cost in USD (0 in mock). */
  costUsd: number;
  note: string;
}

export async function generateArt(prompt: string): Promise<GeneratedArt> {
  if (config.adapterMode === "real") {
    if (!config.art.provider || !config.art.apiKey) {
      throw new Error("Art provider not configured. Set ART_PROVIDER and ART_API_KEY on Day 2.");
    }
    throw new Error(`Art provider "${config.art.provider}" real adapter not yet implemented.`);
  }
  const seed = encodeURIComponent(prompt.slice(0, 40));
  return {
    prompt,
    imageUrl: `mock://art/${seed}.png`,
    width: 3000,
    height: 4000,
    costUsd: 0,
    note: "Mock art (placeholder). Configure a real image model on Day 2.",
  };
}
