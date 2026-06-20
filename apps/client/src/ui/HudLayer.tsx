import { useCallback, useEffect, useRef, useState } from "react";
import { bridge } from "@/game/EventBridge";
import type { AllySummary, HotbarAction, HudState } from "@/types/game";
import { useBridge } from "./useBridge";
import { CoinTicker } from "./components/CoinTicker";
import { MissionPanel } from "./components/MissionPanel";
import { Hotbar } from "./components/Hotbar";
import { HallOfAlliesOverlay } from "./HallOfAlliesOverlay";

const COMING_SOON: Partial<Record<HotbarAction, string>> = {
  missions: "Mission scrolls expand here soon.",
  ledger: "The Ledger Sanctum is coming soon.",
  oracle: "The ABCII Oracle awakens in a later update.",
  map: "The full Olympus map view is coming soon.",
};

/**
 * Always-on HUD overlays: the mission panel (top-left), the Drachmas ticker
 * (top-right), and the bottom hotbar. Also owns the Hall of Allies overlay and
 * a lightweight toast. Earnings are simulated to keep the world feeling alive.
 */
export function HudLayer() {
  const [hud, setHud] = useState<HudState | null>(null);
  const [allies, setAllies] = useState<AllySummary[]>([]);
  const [hallOpen, setHallOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rateRef = useRef(0);

  useBridge(
    "game:hud",
    useCallback((state: HudState) => {
      setHud(state);
      rateRef.current = state.drachmasRate;
    }, []),
  );

  useBridge(
    "game:allies",
    useCallback((list: AllySummary[]) => setAllies(list), []),
  );

  // Close the Hall whenever a dialog opens so overlays don't stack.
  useBridge(
    "game:dialog-open",
    useCallback(() => setHallOpen(false), []),
  );

  // Simulated passive income: small, frequent gains so the coin ticker is alive.
  useEffect(() => {
    if (!hud) return;
    const id = window.setInterval(() => {
      setHud((prev) => (prev ? { ...prev, drachmas: prev.drachmas + 2 + Math.floor(Math.random() * 5) } : prev));
    }, 3500);
    return () => window.clearInterval(id);
  }, [hud !== null]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2200);
  }, []);

  const onHotbar = useCallback(
    (action: HotbarAction) => {
      bridge.emit("ui:hotbar", { action });
      if (action === "hall") {
        setHallOpen((v) => !v);
        return;
      }
      const msg = COMING_SOON[action];
      if (msg) showToast(msg);
    },
    [showToast],
  );

  const onSelectAlly = useCallback((oppId: string) => {
    setHallOpen(false);
    bridge.emit("ui:talk", { oppId });
  }, []);

  if (!hud) return null;

  return (
    <>
      <MissionPanel
        locationLabel={hud.locationLabel}
        missions={hud.missions}
        alerts={hud.alerts}
        alliesOnline={hud.alliesOnline}
      />

      <div className="topbar">
        <div className="realm-badge">
          <span className="sigil">Ω</span>
          <span>Olympus Ops</span>
        </div>
        <CoinTicker drachmas={hud.drachmas} rate={hud.drachmasRate} />
      </div>

      <Hotbar onAction={onHotbar} activeHall={hallOpen} />

      {hallOpen && (
        <HallOfAlliesOverlay
          allies={allies}
          onSelect={onSelectAlly}
          onClose={() => setHallOpen(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
