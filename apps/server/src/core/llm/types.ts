/** Model tiers map to concrete models in each provider (cheap -> frontier). */
export type LlmTier = "fast" | "balanced" | "deep";

/** A tool the model may call. `parameters` is a JSON Schema object. */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export type LlmMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: LlmToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export interface LlmCompleteOptions {
  system: string;
  messages: LlmMessage[];
  tools?: ToolSpec[];
  tier?: LlmTier;
  /** Hints for the mock provider so it can stay in character. Ignored by real providers. */
  meta?: { agent?: string };
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LlmResponse {
  text: string;
  toolCalls: LlmToolCall[];
  usage: LlmUsage;
  provider: "mock" | "anthropic";
}

export interface Llm {
  complete(opts: LlmCompleteOptions): Promise<LlmResponse>;
}
