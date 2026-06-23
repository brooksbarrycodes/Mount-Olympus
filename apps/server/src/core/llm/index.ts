import { llmIsLive } from "../../config.ts";
import type { Llm } from "./types.ts";
import { MockLlm } from "./mockLlm.ts";
import { AnthropicLlm } from "./anthropicLlm.ts";

export type { Llm, LlmMessage, LlmTier, LlmResponse, ToolSpec, LlmToolCall } from "./types.ts";

let cached: Llm | undefined;

/**
 * Returns the active model provider. Mock by default (offline, free). When
 * ADAPTER_MODE=real and a key is present, the real Anthropic adapter is used.
 * The Anthropic client is only constructed in that case, so mock mode never
 * touches the network.
 */
export function getLlm(): Llm {
  if (cached) return cached;
  cached = llmIsLive() ? new AnthropicLlm() : new MockLlm();
  return cached;
}

/** Reset the cached provider (used by tests / after config changes). */
export function resetLlm(): void {
  cached = undefined;
}
