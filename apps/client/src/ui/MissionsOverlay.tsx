import { useEffect, useState } from "react";
import { bridge } from "@/game/EventBridge";
import type { Mission } from "@/net/agentApi";
import {
  completeMissionWithCache,
  createMissionWithCache,
  loadActiveMissions,
  syncMissionsFromServer,
} from "@/game/missions/missionStore";
import { formatCountdown, isUrgent } from "@/game/missions/missionTime";
import { useNow } from "./useNow";

interface Props {
  onClose: () => void;
}

export function MissionsOverlay({ onClose }: Props) {
  const now = useNow(1000);
  const [missions, setMissions] = useState<Mission[]>(() => loadActiveMissions());
  const [title, setTitle] = useState("");
  const [days, setDays] = useState(7);

  const refresh = async () => {
    try {
      const list = await syncMissionsFromServer();
      setMissions(list);
    } catch {
      setMissions(loadActiveMissions());
    }
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const add = async () => {
    if (!title.trim()) return;
    await createMissionWithCache({ title, dueInDays: days });
    setTitle("");
    setMissions(loadActiveMissions());
    bridge.emit("game:missions-updated", undefined);
  };

  const complete = async (id: number) => {
    await completeMissionWithCache(id);
    setMissions(loadActiveMissions());
    bridge.emit("game:missions-updated", undefined);
  };

  return (
    <div className="dash-backdrop" onClick={onClose}>
      <div className="dash-panel missions-panel" onClick={(e) => e.stopPropagation()}>
        <header className="treasury-header">
          <h2>Missions</h2>
          <button type="button" className="tyche-btn tyche-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="missions-add">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New mission…"
            className="missions-input"
          />
          <label>
            Due in days{" "}
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="missions-days"
            />
          </label>
          <button type="button" className="tyche-btn" onClick={() => void add()}>
            Add
          </button>
        </div>

        <ul className="missions-list-full">
          {missions.map((m) => {
            const cd = formatCountdown(m.dueAt, now);
            return (
              <li key={m.id} className={isUrgent(m.dueAt, now) ? "mission-urgent" : ""}>
                <button type="button" className="mission-check" onClick={() => void complete(m.id)}>
                  ○
                </button>
                <div>
                  <strong>{m.title}</strong>
                  {m.description && <p>{m.description}</p>}
                </div>
                {cd && <span className="mission-countdown">{cd}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export { formatCountdown } from "@/game/missions/missionTime";
