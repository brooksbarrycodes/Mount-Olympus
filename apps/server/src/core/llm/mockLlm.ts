import type { Llm, LlmCompleteOptions, LlmMessage, LlmResponse, LlmToolCall } from "./types.ts";

/**
 * Offline stand-in for a real model. It does two jobs so the entire agent
 * system is exercised with zero keys and zero cost:
 *
 *  1. Drives the tool-calling loop: each agent has an ordered "plan" of tools
 *     it should call; the mock walks that plan, then produces a final answer.
 *  2. Produces in-character text that reflects the tool results it has seen.
 *
 * When ADAPTER_MODE=real and an Anthropic key exists, this is replaced wholesale
 * by AnthropicLlm. No agent or runtime code changes.
 */

const MOCK_PLANS: Record<string, string[]> = {
  zeus: ["ledger_summary", "list_approvals"],
  oracle: ["pinterest_trends", "google_trends", "recommend_niche"],
  apollo: ["get_niche", "generate_art", "write_listing", "create_etsy_draft"],
};

function lastUserText(messages: LlmMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") return m.content;
  }
  return "";
}

function toolResults(messages: LlmMessage[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of messages) {
    if (m.role === "tool") out[m.name] = m.content;
  }
  return out;
}

function parse<T = Record<string, unknown>>(json: string | undefined): T | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

function mockArgs(toolName: string, userText: string): Record<string, unknown> {
  const topic = userText.slice(0, 80) || "wall art";
  switch (toolName) {
    case "pinterest_trends":
    case "google_trends":
      return { category: "wall art" };
    case "record_prediction":
      return {
        topic: "minimalist line-art portraits",
        prediction: "rising demand over the next 4-6 weeks",
        confidence: 0.62,
      };
    case "recommend_niche":
      return {
        niche: "minimalist line-art portraits",
        rationale: "rising on Pinterest, still-thin competition, print-friendly",
        confidence: 0.62,
      };
    case "generate_art":
      return { prompt: `minimalist ${topic} poster, clean vector, neutral palette` };
    case "write_listing":
      return { topic };
    case "create_etsy_draft":
      return { title: "Minimalist Line-Art Print", price: 24 };
    default:
      return {};
  }
}

function finalText(agent: string | undefined, messages: LlmMessage[]): string {
  const results = toolResults(messages);
  const ask = lastUserText(messages);

  if (agent === "zeus") {
    const led = parse<{ totals?: { profit?: number; revenue?: number; margin?: number } }>(
      results["ledger_summary"],
    );
    const profit = led?.totals?.profit ?? 0;
    const margin = led?.totals?.margin ?? 0;
    return (
      `Here's where we stand: ${profit >= 0 ? "profit" : "loss"} of ` +
      `$${Math.abs(Math.round(profit)).toLocaleString()} at a ${(margin * 100).toFixed(0)}% margin.\n\n` +
      `On "${ask.slice(0, 120)}": I'd pull fresh ledger data before committing, but the usual playbook is ` +
      `have the Oracle research a rising niche, then have Apollo draft listings for your approval. ` +
      `Nothing publishes without your sign-off, and we stay within the daily spend cap.\n\n` +
      `(Offline mock mode — set ADAPTER_MODE=real and an Anthropic key for live reasoning.)`
    );
  }

  if (agent === "oracle") {
    const committed = parse<{ niche?: string }>(results["recommend_niche"]);
    const pin = parse<{ rising?: string[] }>(results["pinterest_trends"]);
    const top = committed?.niche ?? pin?.rising?.[0] ?? "minimalist line-art portraits";
    return (
      `The vapors clear. Reading Pinterest and search winds together, the strongest rising ` +
      `current is "${top}" -- climbing interest, still-thin competition, and print-friendly.\n\n` +
      `I have committed the store to "${top}" so Apollo may forge listings at once. I will watch ` +
      `the analytics; if conversion falters within two weeks, I will counsel a pivot. This ` +
      `prediction is logged so my accuracy can be judged against real sales.\n\n` +
      `(Mock divination -- on Day 2 I read live Google/Pinterest Trends.)`
    );
  }

  if (agent === "apollo") {
    const draft = parse<{ draftId?: string; title?: string }>(results["create_etsy_draft"]);
    return (
      `The work is forged, Archon. I have rendered the art, written the listing, and assembled ` +
      `a DRAFT (${draft?.draftId ?? "draft-pending"}: "${draft?.title ?? "Untitled Print"}"). ` +
      `It now awaits your approval -- I publish nothing on my own.\n\n` +
      `(Mock craft -- on Day 2 I generate real art and push real Etsy drafts.)`
    );
  }

  return `Acknowledged: "${ask.slice(0, 160)}". (Mock response; configure a real model on Day 2.)`;
}

export class MockLlm implements Llm {
  async complete(opts: LlmCompleteOptions): Promise<LlmResponse> {
    const agent = opts.meta?.agent;
    const available = new Set((opts.tools ?? []).map((t) => t.name));
    const plan = (MOCK_PLANS[agent ?? ""] ?? []).filter((n) => available.has(n));
    const called = new Set(
      opts.messages.filter((m): m is Extract<LlmMessage, { role: "tool" }> => m.role === "tool").map(
        (m) => m.name,
      ),
    );

    const next = plan.find((name) => !called.has(name));
    if (next) {
      const call: LlmToolCall = {
        id: `mock-${next}-${called.size}`,
        name: next,
        args: mockArgs(next, lastUserText(opts.messages)),
      };
      return {
        text: "",
        toolCalls: [call],
        usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        provider: "mock",
      };
    }

    return {
      text: finalText(agent, opts.messages),
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      provider: "mock",
    };
  }
}
