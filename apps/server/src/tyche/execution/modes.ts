import type { TycheMode } from "../../config.ts";

export function modeAllowsExecution(mode: TycheMode): boolean {
  return mode === "paper" || mode === "sandbox" || mode === "live";
}

export function modeUsesRealOrders(mode: TycheMode): boolean {
  return mode === "sandbox" || mode === "live";
}

export function modeLabel(mode: TycheMode): string {
  return mode;
}
