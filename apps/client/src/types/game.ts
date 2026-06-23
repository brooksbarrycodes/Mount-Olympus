/** Shared types across Phaser game systems and React overlays. */

export type Direction = "down" | "up" | "side";

export type OppStatus =
  | "overseeing"
  | "running"
  | "thinking"
  | "drafting"
  | "scheduling"
  | "idle";

export const STATUS_LABEL: Record<OppStatus, string> = {
  overseeing: "Overseeing",
  running: "Running",
  thinking: "Thinking",
  drafting: "Drafting",
  scheduling: "Scheduling",
  idle: "Idle",
};

/** A controllable/animated character in the world (an "Opp"). */
export interface OppDef {
  id: string;
  name: string;
  title: string;
  domain: string;
  textureKey: string;
  /** UI accent color (hex). */
  accent: string;
  spawn: { x: number; y: number };
  /** Optional idle wander radius in pixels. */
  wanderRadius?: number;
  /** In-world speech-bubble lines. */
  chatter: string[];
  status: OppStatus;
  /** Short description of what they're doing right now. */
  activity: string;
  /** Current task name, if any. */
  task?: string;
  /** First line shown when opening their dialog. */
  greeting: string;
  /** If set, their dialog offers entry to this location interior. */
  homeLocationId?: string;
  /** Business this god heads (links to businessStats for the command dashboard). */
  businessId?: string;
  /** Render a soft divine glow under this Opp (Zeus always glows). */
  divineGlow?: boolean;
}

/** A building/landmark placed on the map. */
export interface LocationDef {
  id: string;
  name: string;
  textureKey: string;
  /** World center position. */
  x: number;
  y: number;
  enterable: boolean;
  description: string;
  /** Door offset from the building base where the interact zone sits. */
  doorOffsetY: number;
  /** Display scale applied to the (large) building sprite. Default 1. */
  scale?: number;
}

export type InteractionKind = "talk" | "enter" | "exit";

/** The single currently-actionable interaction near the player. */
export interface InteractionTarget {
  kind: InteractionKind;
  label: string;
  /** Opp id (talk) or location id (enter/exit). */
  refId: string;
}

export interface MissionItem {
  id: string;
  label: string;
  done: boolean;
}

export interface HudState {
  drachmas: number;
  /** Drachmas earned per hour (display only). */
  drachmasRate: number;
  alerts: number;
  alliesOnline: number;
  missions: MissionItem[];
  /** e.g. "Mount Olympus" or "Temple of Zeus". */
  locationLabel: string;
}

export interface ChatMessage {
  from: "you" | "opp";
  text: string;
}

/** Data the React dialog needs to render an Opp interaction. */
export interface OppDialogData {
  oppId: string;
  name: string;
  title: string;
  domain: string;
  accent: string;
  status: OppStatus;
  activity: string;
  task?: string;
  textureKey: string;
  greeting: string;
  enterTemple?: { locationId: string; label: string };
}

/** Summary row for the Hall of Allies overlay. */
export interface AllySummary {
  id: string;
  name: string;
  title: string;
  status: OppStatus;
  accent: string;
}

export type HotbarAction = "missions" | "ledger" | "oracle" | "hall" | "map";
