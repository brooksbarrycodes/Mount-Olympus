/** Optional LLM suggester — never used for auto-exec. Stub returns empty. */
export async function suggestPossibleMatches(
  _kalshi: unknown[],
  _px: unknown[],
): Promise<Array<{ kalshiId: string; pxId: string; note: string }>> {
  return [];
}
