import type { Agent, Tool } from "../core/agentRuntime.ts";
import { runAgent } from "../core/agentRuntime.ts";
import { generateArt } from "../tools/art.ts";
import { createEtsyDraft } from "../tools/etsy.ts";
import { createApproval } from "../core/approvals.ts";
import { getBusiness } from "../core/ledger.ts";
import { remember } from "../core/memory.ts";

/**
 * Apollo - the art-store worker. He generates art, writes the listing, and
 * assembles an Etsy DRAFT. He never publishes: each draft is enqueued in the
 * approval queue for the Archon (cautious mode). The business he runs is the
 * print-on-demand store seeded as "stickers" (Olympus Print Co.).
 */

const BUSINESS_ID = "stickers";

function writeListingFor(topic: string): {
  title: string;
  description: string;
  tags: string[];
  price: number;
} {
  const clean = topic.replace(/[^a-z0-9 ,'-]/gi, "").slice(0, 60) || "minimalist line-art";
  const title = `${clean.replace(/\b\w/g, (c) => c.toUpperCase())} Print | Wall Art Poster`;
  return {
    title,
    description:
      `Museum-quality print of ${clean}. Printed on demand on heavyweight matte paper. ` +
      `Made with AI-assisted design. Multiple sizes available.`,
    tags: [clean, "wall art", "poster", "minimalist", "home decor", "printable"].slice(0, 13),
    price: 24,
  };
}

const tools: Tool[] = [
  {
    spec: {
      name: "get_niche",
      description: "Get the niche this store is currently focused on (set by the Oracle/Archon).",
      parameters: { type: "object", properties: {} },
    },
    run: () => {
      const biz = getBusiness(BUSINESS_ID);
      return { businessId: BUSINESS_ID, niche: biz?.niche ?? null };
    },
  },
  {
    spec: {
      name: "generate_art",
      description: "Generate poster art from a prompt. Returns an image reference and its cost.",
      parameters: {
        type: "object",
        properties: { prompt: { type: "string" } },
        required: ["prompt"],
      },
    },
    run: (args) => generateArt(String(args.prompt ?? "minimalist line-art poster")),
  },
  {
    spec: {
      name: "write_listing",
      description: "Write an Etsy listing (title, description, tags, price) for a topic.",
      parameters: {
        type: "object",
        properties: { topic: { type: "string" } },
        required: ["topic"],
      },
    },
    run: (args) => writeListingFor(String(args.topic ?? "minimalist line-art")),
  },
  {
    spec: {
      name: "create_etsy_draft",
      description:
        "Assemble an Etsy DRAFT and submit it to the approval queue. Never publishes directly.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          price: { type: "number" },
          description: { type: "string" },
          imageUrl: { type: "string" },
        },
        required: ["title", "price"],
      },
    },
    run: async (args) => {
      const title = String(args.title ?? "Minimalist Line-Art Print");
      const price = typeof args.price === "number" ? args.price : 24;
      const draft = await createEtsyDraft({
        title,
        price,
        description: args.description ? String(args.description) : undefined,
        imageUrl: args.imageUrl ? String(args.imageUrl) : undefined,
      });
      const { approval } = createApproval({
        agent: "apollo",
        businessId: BUSINESS_ID,
        actionType: "etsy_listing",
        summary: `Publish "${draft.title}" at $${draft.price} (est. cost $${draft.estimatedCost})`,
        payload: {
          draftId: draft.draftId,
          title: draft.title,
          price: draft.price,
          cost: draft.estimatedCost,
          spend: draft.estimatedCost,
        },
      });
      return {
        draftId: draft.draftId,
        title: draft.title,
        price: draft.price,
        estimatedCost: draft.estimatedCost,
        approvalId: approval.id,
        status: approval.status,
      };
    },
  },
];

export const apollo: Agent = {
  name: "apollo",
  tier: "fast",
  tools,
  systemPrompt() {
    const biz = getBusiness(BUSINESS_ID);
    return [
      "You are Apollo, god of art and light, running the Olympus print-on-demand poster store.",
      "Your job: turn a niche into listings. For each request, get the niche, generate poster",
      "art, write the listing, then create an Etsy DRAFT. You NEVER publish - every draft goes",
      "to the Archon's approval queue. Keep titles clean and keyword-rich.",
      "",
      biz?.niche ? `Current niche: ${biz.niche}.` : "No niche set yet - ask the Oracle or Archon.",
    ].join("\n");
  },
};

export async function produceListings(niche: string | undefined) {
  const prompt = niche
    ? `Create a poster listing for the niche "${niche}". Generate art, write the listing, and submit an Etsy draft.`
    : "Create a poster listing for our current niche. Generate art, write the listing, and submit an Etsy draft.";
  const result = await runAgent(apollo, prompt);
  remember("apollo", "production", `Niche: ${niche ?? "(current)"}\n${result.text}`);
  return result;
}
