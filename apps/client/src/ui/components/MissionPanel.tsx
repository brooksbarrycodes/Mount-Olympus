import type { MissionItem } from "@/types/game";
import { isUrgent } from "@/game/missions/missionTime";

interface Props {
  locationLabel: string;
  missions: MissionItem[];
  nowMs: number;
  alerts: number;
  alliesOnline: number;
  onExpand?: () => void;
}

export function MissionPanel({ locationLabel, missions, nowMs, alerts, alliesOnline, onExpand }: Props) {
  return (
    <div className="mission-panel hud-card" onClick={onExpand} role={onExpand ? "button" : undefined}>
      <div className="hud-card-header">
        <span className="sigil">⚔</span>
        <div>
          <div className="hud-card-title">Mission HUD</div>
          <div className="hud-card-sub">{locationLabel}</div>
        </div>
      </div>

      <ul className="mission-list">
        {missions.map((m) => {
          const urgent = m.dueAt ? isUrgent(m.dueAt, nowMs) : false;
          return (
            <li key={m.id} className={`mission-item ${m.done ? "done" : ""} ${urgent ? "mission-urgent" : ""}`}>
              <span className="mission-check">{m.done ? "✓" : "◇"}</span>
              <span className="mission-label">{m.label}</span>
              {m.countdown && <span className="mission-countdown">{m.countdown}</span>}
            </li>
          );
        })}
        {missions.length === 0 && (
          <li className="mission-item mission-empty">
            <span className="mission-check">◇</span>
            <span className="mission-label">No reminders — ask Zeus to add one</span>
          </li>
        )}
      </ul>

      <div className="mission-meta">
        <span className="meta-pill alert">⚡ {alerts} alerts</span>
        <span className="meta-pill">🏛 {alliesOnline} allies</span>
      </div>
    </div>
  );
}
