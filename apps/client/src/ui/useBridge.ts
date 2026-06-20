import { useEffect } from "react";
import { bridge, type GameEventMap } from "@/game/EventBridge";

/**
 * Subscribe a React component to a bridge event for its lifetime. The handler
 * is stored in a ref-free closure that re-binds whenever `handler` changes, so
 * callers can pass inline functions safely.
 */
export function useBridge<K extends keyof GameEventMap>(
  event: K,
  handler: (payload: GameEventMap[K]) => void,
): void {
  useEffect(() => {
    bridge.on(event, handler);
    return () => {
      bridge.off(event, handler);
    };
  }, [event, handler]);
}
