import type { AllySummary } from "@/types/game";
import { STATUS_LABEL } from "@/types/game";

interface Props {
  allies: AllySummary[];
  onSelect: (oppId: string) => void;
  onClose: () => void;
}

/**
 * The "Hall of Allies" quick-access overlay (opened from the hotbar, not always
 * visible). Selecting an ally opens the same interaction dialog used by walking
 * up and pressing E. Future Opps appear here automatically from world data.
 */
export function HallOfAlliesOverlay({ allies, onSelect, onClose }: Props) {
  return (
    <div className="hall-scrim" onMouseDown={onClose}>
      <div className="hall" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Hall of Allies">
        <header className="hall-header">
          <div>
            <h2 className="hall-title">Hall of Allies</h2>
            <p className="hall-sub">Summon any Opp to speak with them at once.</p>
          </div>
          <button className="dialog-close" onClick={onClose}>
            Esc
          </button>
        </header>

        <div className="hall-grid">
          {allies.map((a) => (
            <button
              key={a.id}
              className="ally-card"
              style={{ ["--accent" as string]: a.accent }}
              onClick={() => onSelect(a.id)}
            >
              <span className={`ally-dot status-${a.status}`} />
              <span className="ally-info">
                <span className="ally-name">{a.name}</span>
                <span className="ally-title">{a.title}</span>
              </span>
              <span className="ally-status">{STATUS_LABEL[a.status]}</span>
            </button>
          ))}

          <div className="ally-card ally-empty">
            <span className="ally-info">
              <span className="ally-name">More allies await</span>
              <span className="ally-title">Summon new Opps as Olympus grows</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
