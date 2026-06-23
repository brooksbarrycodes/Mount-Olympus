import { config } from "../config.ts";

/** Web search for the Oracle's on-demand research. Mock until Day 2. */

export interface WebSearchResult {
  query: string;
  results: { title: string; snippet: string }[];
  note: string;
}

export async function webSearch(query: string): Promise<WebSearchResult> {
  if (config.adapterMode === "real") {
    throw new Error("Web search real adapter not configured. Set up on Day 2.");
  }
  return {
    query,
    results: [
      {
        title: "Etsy bestseller analysis (mock)",
        snippet:
          "Minimalist line-art and celestial prints show steady growth; competition is moderate but quality bar is rising.",
      },
      {
        title: "Print-on-demand margins (mock)",
        snippet: "Posters priced $20-40 leave healthy margin after Printify cost and Etsy fees.",
      },
    ],
    note: `Mock web search for "${query}". Configure a real search tool on Day 2.`,
  };
}
