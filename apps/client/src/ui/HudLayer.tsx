import { useCallback, useEffect, useState } from "react";
import { bridge } from "@/game/EventBridge";
import type { AllySummary, HotbarAction, HudState, MissionItem } from "@/types/game";
import { loadActiveMissions, syncMissionsFromServer } from "@/game/missions/missionStore";
import { formatCountdown } from "@/game/missions/missionTime";
import { useBridge } from "./useBridge";
import { useNow } from "./useNow";
import { CoinTicker } from "./components/CoinTicker";
import { MissionPanel } from "./components/MissionPanel";
import { Hotbar } from "./components/Hotbar";
import { HallOfAlliesOverlay } from "./HallOfAlliesOverlay";
import { MusicToggle } from "./components/MusicToggle";
import { agentApi } from "@/net/agentApi";

function toMissionItems(
  missions: ReturnType<typeof loadActiveMissions>,
  nowMs: number,
): MissionItem[] {
  return missions.map((m) => ({
    id: String(m.id),
    label: m.title,
    done: false,
    dueAt: m.dueAt,
    countdown: formatCountdown(m.dueAt, nowMs),
  }));
}

/**
 * Always-on HUD: real treasury balance, live missions, hotbar.
 * Mission countdowns use wall-clock time + localStorage cache (server optional).
 */
export function HudLayer({ onOpenTreasury }: { onOpenTreasury?: () => void }) {
  const now = useNow(1000);
  const [hud, setHud] = useState<HudState | null>(null);
  const [missions, setMissions] = useState<MissionItem[]>(() => toMissionItems(loadActiveMissions(), Date.now()));
  const [allies, setAllies] = useState<AllySummary[]>([]);
  const [hallOpen, setHallOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refreshTreasury = useCallback(async () => {
    try {
      const s = await agentApi.treasurySummary();
      setHud((prev) =>
        prev
          ? {
              ...prev,
              drachmas: s.balance,
              drachmasMonthNet: s.monthNet,
              drachmasWeekNet: s.weekNet,
              drachmasNegative: s.negative,
            }
          : prev,
      );
    } catch {
      /* server offline */
    }
  }, []);

  const refreshMissions = useCallback(async () => {
    try {
      const list = await syncMissionsFromServer();
      setMissions(toMissionItems(list, Date.now()));
    } catch {
      setMissions(toMissionItems(loadActiveMissions(), Date.now()));
    }
  }, []);

  useBridge(
    "game:hud",
    useCallback((state: HudState) => {
      setHud(state);
    }, []),
  );

  useBridge(
    "game:allies",
    useCallback((list: AllySummary[]) => setAllies(list), []),
  );

  useBridge("game:dialog-open", useCallback(() => setHallOpen(false), []));

  useBridge(
    "game:missions-updated",
    useCallback(() => {
      void refreshMissions();
    }, [refreshMissions]),
  );

  useEffect(() => {
    void refreshTreasury();
    void refreshMissions();
    const poll = window.setInterval(() => {
      void refreshTreasury();
      void refreshMissions();
    }, 30000);
    return () => clearInterval(poll);
  }, [refreshTreasury, refreshMissions]);

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
      if (action === "ledger") {
        bridge.emit("game:open-dashboard", undefined);
        return;
      }
      if (action === "missions") {
        bridge.emit("game:open-missions", undefined);
        return;
      }
      if (action === "oracle") {
        bridge.emit("ui:talk", { oppId: "oracle" });
        return;
      }
      if (action === "map") showToast("The full Olympus map view is coming soon.");
    },
    [showToast],
  );

  const onSelectAlly = useCallback((oppId: string) => {
    setHallOpen(false);
    bridge.emit("ui:talk", { oppId });
  }, []);

  const liveMissions = missions.map((m) => ({
    ...m,
    countdown: m.dueAt ? formatCountdown(m.dueAt, now) : "",
  }));

  if (!hud) {
    return (
      <div className="topbar">
        <MusicToggle />
      </div>
    );
  }

  return (
    <>
      <MissionPanel
        locationLabel={hud.locationLabel}
        missions={liveMissions}
        nowMs={now}
        alerts={hud.alerts}
        alliesOnline={hud.alliesOnline}
        onExpand={() => bridge.emit("game:open-missions", undefined)}
      />

      <div className="topbar">
        <div className="realm-badge">
          <span className="sigil">Ω</span>
          <span>Olympus Ops</span>
        </div>
        <CoinTicker
          drachmas={hud.drachmas}
          monthNet={hud.drachmasMonthNet}
          weekNet={hud.drachmasWeekNet}
          negative={hud.drachmasNegative}
          onClick={onOpenTreasury}
        />
        <MusicToggle />
      </div>

      <Hotbar onAction={onHotbar} activeHall={hallOpen} />

      {hallOpen && (
        <HallOfAlliesOverlay allies={allies} onSelect={onSelectAlly} onClose={() => setHallOpen(false)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
