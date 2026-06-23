import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config.ts";
import { kvGet, kvSet } from "../db.ts";
import type { Llm, LlmCompleteOptions, LlmResponse, LlmTier, LlmToolCall } from "./types.ts";

/**
 * Hard monthly spend cap. This is a deterministic guardrail on the one cost the
 * agents incur autonomously (their own thinking). Spend is tracked per calendar
 * month in the kv store so it survives restarts. Mock mode never reaches here.
 */
function monthKey(): string {
  const d = new Date();
  return `llm_spend:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function llmSpendThisMonth(): number {
  return Number(kvGet(monthKey()) ?? 0);
}

function addLlmSpend(costUsd: number): void {
  kvSet(monthKey(), String(llmSpendThisMonth() + costUsd));
}

/**
 * Real model adapter. Dormant until ADAPTER_MODE=real and ANTHROPIC_API_KEY is
 * set. Implements the same Llm interface as MockLlm, so flipping providers
 * requires no changes anywhere else.
 */

const PRICING: Record<LlmTier, { in: number; out: number }> = {
  fast: { in: 1, out: 5 },
  balanced: { in: 3, out: 15 },
  deep: { in: 5, out: 25 },
};

function modelFor(tier: LlmTier): string {
  if (tier === "fast") return config.models.fast;
  if (tier === "deep") return config.models.deep;
  return config.models.balanced;
}

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

function toAnthropicMessages(opts: LlmCompleteOptions): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of opts.messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const blocks: Block[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls ?? []) {
        blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.args });
      }
      out.push({ role: "assistant", content: blocks as unknown as Anthropic.ContentBlockParam[] });
    } else {
      out.push({
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: m.toolCallId, content: m.content },
        ] as unknown as Anthropic.ContentBlockParam[],
      });
    }
  }
  return out;
}

export class AnthropicLlm implements Llm {
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  async complete(opts: LlmCompleteOptions): Promise<LlmResponse> {
    const cap = config.llmMonthlyBudgetUsd;
    if (cap > 0 && llmSpendThisMonth() >= cap) {
      throw new Error(
        `LLM monthly budget cap reached ($${cap.toFixed(2)} spent). ` +
          `Raise LLM_MONTHLY_BUDGET_USD to continue, or wait for next month.`,
      );
    }

    const tier: LlmTier = opts.tier ?? "balanced";
    const resp = await this.client.messages.create({
      model: modelFor(tier),
      max_tokens: 1024,
      system: opts.system,
      messages: toAnthropicMessages(opts),
      tools: (opts.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      })),
    });

    let text = "";
    const toolCalls: LlmToolCall[] = [];
    for (const block of resp.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          args: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    const price = PRICING[tier];
    const inTok = resp.usage.input_tokens;
    const outTok = resp.usage.output_tokens;
    const costUsd = (inTok / 1e6) * price.in + (outTok / 1e6) * price.out;
    addLlmSpend(costUsd);

    return {
      text,
      toolCalls,
      usage: { inputTokens: inTok, outputTokens: outTok, costUsd },
      provider: "anthropic",
    };
  }
}
