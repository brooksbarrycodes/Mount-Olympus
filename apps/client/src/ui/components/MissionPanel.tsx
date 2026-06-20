import type { MissionItem } from "@/types/game";

interface Props {
  locationLabel: string;
  missions: MissionItem[];
  alerts: number;
  alliesOnline: number;
}

/**
 * Top-left mission HUD overlay: where you are, your current directives, and a
 * couple of at-a-glance counts. Sits over the map; not a separate page.
 */
export function MissionPanel({ locationLabel, missions, alerts, alliesOnline }: Props) {
  return (
    <div className="mission-panel hud-card">
      <div className="hud-card-header">
        <span className="sigil">⚔</span>
        <div>
          <div className="hud-card-title">Mission HUD</div>
          <div className="hud-card-sub">{locationLabel}</div>
        </div>
      </div>

      <ul className="mission-list">
        {missions.map((m) => (
          <li key={m.id} className={`mission-item ${m.done ? "done" : ""}`}>
            <span className="mission-check">{m.done ? "✓" : "◇"}</span>
            <span>{m.label}</span>
          </li>
        ))}
      </ul>

      <div className="mission-meta">
        <span className="meta-pill alert">⚡ {alerts} alerts</span>
        <span className="meta-pill">🏛 {alliesOnline} allies</span>
      </div>
    </div>
  );
}
