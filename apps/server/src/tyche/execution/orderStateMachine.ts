export type OrderState = "pending" | "partial" | "filled" | "cancelled" | "failed";

const TRANSITIONS: Record<OrderState, OrderState[]> = {
  pending: ["partial", "filled", "cancelled", "failed"],
  partial: ["filled", "cancelled", "failed"],
  filled: [],
  cancelled: [],
  failed: [],
};

export function canTransition(from: OrderState, to: OrderState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextState(current: OrderState, filledQty: number, targetQty: number): OrderState {
  if (filledQty >= targetQty) return "filled";
  if (filledQty > 0) return "partial";
  return current;
}
