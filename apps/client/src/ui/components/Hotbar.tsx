import type { HotbarAction } from "@/types/game";

interface Props {
  onAction: (action: HotbarAction) => void;
  activeHall: boolean;
}

const SLOTS: Array<{ action: HotbarAction; glyph: string; label: string }> = [
  { action: "missions", glyph: "⚔", label: "Missions" },
  { action: "ledger", glyph: "𐅵", label: "Ledger" },
  { action: "oracle", glyph: "☉", label: "Oracle" },
  { action: "hall", glyph: "🏛", label: "Hall of Allies" },
  { action: "map", glyph: "🗺", label: "Map" },
];

/** Bottom-center hotbar. Stardew-style slots that open overlays / panels. */
export function Hotbar({ onAction, activeHall }: Props) {
  return (
    <div className="hotbar">
      {SLOTS.map((s) => (
        <button
          key={s.action}
          className={`hotbar-slot ${s.action === "hall" && activeHall ? "active" : ""}`}
          onClick={() => onAction(s.action)}
          title={s.label}
        >
          <span className="hotbar-glyph">{s.glyph}</span>
          <span className="hotbar-label">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
