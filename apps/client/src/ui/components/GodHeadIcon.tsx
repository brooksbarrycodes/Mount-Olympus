import { OppPortrait } from "../OppPortrait";
import { opps } from "@/game/world/agentStates";

const GOD_NAMES: Record<string, string> = Object.fromEntries(
  opps.map((o) => [o.id, o.name]),
);
GOD_NAMES.archon = "Brooks (personal)";

interface Props {
  godId: string;
  size?: number;
}

/** Small god head for treasury rows; crown for archon/personal spend. */
export function GodHeadIcon({ godId, size = 28 }: Props) {
  const name = GOD_NAMES[godId] ?? godId;

  if (godId === "archon") {
    return (
      <span className="god-head god-head--archon" title={name} aria-label={name}>
        ♛
      </span>
    );
  }

  return (
    <span className="god-head" title={name} aria-label={name}>
      <OppPortrait oppId={godId} size={size} />
    </span>
  );
}

export function godDisplayName(godId: string): string {
  return GOD_NAMES[godId] ?? godId;
}
