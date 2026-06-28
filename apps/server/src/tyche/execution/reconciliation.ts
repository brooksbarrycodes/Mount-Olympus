/** Query order status before assuming failure. Stub for demo. */
export async function reconcileOrder(
  _venue: string,
  orderId: string | null,
): Promise<"filled" | "pending" | "cancelled" | "failed"> {
  if (!orderId) return "failed";
  if (orderId.startsWith("PAPER-")) return "filled";
  return "filled";
}
