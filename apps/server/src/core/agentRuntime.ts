import { getLlm } from "./llm/index.ts";
import type { LlmMessage, LlmTier, ToolSpec } from "./llm/types.ts";
import * as audit from "./auditLog.ts";

/** A callable tool: its public spec plus the implementation. */
export interface Tool {
  spec: ToolSpec;
  run(args: Record<string, unknown>): Promise<unknown> | unknown;
}

export interface Agent {
  /** Stable id used for memory, audit, and mock-provider hints (e.g. "zeus"). */
  name: string;
  tier: LlmTier;
  /** Build the system prompt fresh each turn (so it can include live state). */
  systemPrompt(): string;
  tools: Tool[];
}

export interface AgentRunResult {
  text: string;
  toolsUsed: string[];
  costUsd: number;
  provider: "mock" | "anthropic";
}

const MAX_STEPS = 8;

/**
 * Runs one agent turn: think -> (maybe call tools) -> observe -> repeat, until
 * the model returns a final text answer or we hit the step ceiling. Every tool
 * call is written to the audit log with its cost.
 */
export async function runAgent(
  agent: Agent,
  userMessage: string,
  opts?: { priorMessages?: LlmMessage[] },
): Promise<AgentRunResult> {
  const llm = getLlm();
  const toolByName = new Map(agent.tools.map((t) => [t.spec.name, t]));
  const specs: ToolSpec[] = agent.tools.map((t) => t.spec);
  const prior = opts?.priorMessages ?? [];
  const messages: LlmMessage[] = [...prior, { role: "user", content: userMessage }];

  const toolsUsed: string[] = [];
  let costUsd = 0;
  let provider: "mock" | "anthropic" = "mock";

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await llm.complete({
      system: agent.systemPrompt(),
      messages,
      tools: specs,
      tier: agent.tier,
      meta: { agent: agent.name },
    });
    costUsd += res.usage.costUsd;
    provider = res.provider;

    if (res.toolCalls.length === 0) {
      return { text: res.text.trim(), toolsUsed, costUsd, provider };
    }

    // Record the assistant's tool-call turn, then execute each tool.
    messages.push({ role: "assistant", content: res.text, toolCalls: res.toolCalls });

    for (const call of res.toolCalls) {
      const tool = toolByName.get(call.name);
      let resultStr: string;
      if (!tool) {
        resultStr = JSON.stringify({ error: `unknown tool: ${call.name}` });
      } else {
        try {
          const result = await tool.run(call.args ?? {});
          resultStr = typeof result === "string" ? result : JSON.stringify(result);
          toolsUsed.push(call.name);
          audit.record({
            agent: agent.name,
            action: `tool:${call.name}`,
            detail: { args: call.args },
            status: "executed",
          });
        } catch (err) {
          resultStr = JSON.stringify({ error: String(err) });
          audit.record({
            agent: agent.name,
            action: `tool:${call.name}`,
            detail: { args: call.args, error: String(err) },
            status: "blocked",
          });
        }
      }
      messages.push({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: resultStr,
      });
    }
  }

  return {
    text: "I hit my step limit before finishing. Try asking again with a narrower question.",
    toolsUsed,
    costUsd,
    provider,
  };
}
