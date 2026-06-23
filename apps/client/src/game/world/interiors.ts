import { TX } from "../art/keys";

/**
 * Interior room definitions for enterable buildings. Each is a grand marble hall
 * dressed with a back colonnade, glowing braziers, banners, a central mosaic and
 * (for temples) a raised dais with a throne + cult statue. Driven by data so new
 * interiors are added without touching the scene.
 */

export interface InteriorProp {
  key: string;
  x: number;
  y: number;
  /** Optional display scale override (else PROP_SCALE default). */
  scale?: number;
}

export interface Placard {
  x: number;
  y: number;
  title: string;
  subtitle: string;
}

export interface InteriorDef {
  id: string;
  name: string;
  width: number;
  height: number;
  accent: string;
  /** Visual theme controls the procedural dressing the scene paints. */
  theme: "pantheon" | "temple";
  /** Hex color of the central woven mosaic rug. */
  rug: string;
  /** Where the player appears when entering. */
  entry: { x: number; y: number };
  /** The exit mat (walk here + E to leave). */
  exit: { x: number; y: number };
  /** Brazier positions (rendered with a flickering glow). */
  braziers: Array<{ x: number; y: number }>;
  /** Hanging banners along the back wall. */
  banners: number[];
  props: InteriorProp[];
  placards: Placard[];
  /** A raised dais + statue at the back (temples). */
  dais?: { x: number; y: number; w: number; statue: string };
  /** An Opp present inside this room (by id), with a position. */
  occupant?: { oppId: string; x: number; y: number };

  // ---- Pantheon command-hall extensions (all optional) ----
  /** Long rectangular council table: center + full width/height (also the collider). */
  table?: { x: number; y: number; w: number; h: number };
  /** Council seats per long side (chairs are tucked along the table edges). */
  seatsPerSide?: number;
  /** Where the player sits to preside / call a meeting (head of the table). */
  headSeat?: { x: number; y: number };
  /** Command desk base (bottom-center). Sitting here opens the dashboard. */
  desk?: { x: number; y: number };
  /** Back-dais throne base (bottom-center); the player's seat at the desk. */
  throne?: { x: number; y: number };
  /** God Opp ids that gather at the table for meetings. */
  attendees?: string[];
  /** Standing candelabra positions. */
  candelabra?: Array<{ x: number; y: number }>;
  /** X positions of golden wall-relief medallions on the back wall. */
  reliefs?: number[];
  /** Render a domed oculus light beam over the hall. */
  oculus?: boolean;
}

export const interiors: Record<string, InteriorDef> = {
  pantheon: {
    id: "pantheon",
    name: "The Pantheon",
    width: 920,
    height: 720,
    accent: "#3a5d9c",
    theme: "pantheon",
    rug: "#27406b",
    entry: { x: 460, y: 660 },
    exit: { x: 460, y: 696 },
    oculus: true,
    table: { x: 460, y: 462, w: 158, h: 252 },
    seatsPerSide: 3,
    headSeat: { x: 460, y: 326 },
    desk: { x: 460, y: 250 },
    attendees: ["zeus", "oracle", "apollo"],
    candelabra: [
      { x: 300, y: 250 },
      { x: 620, y: 250 },
      { x: 120, y: 470 },
      { x: 800, y: 470 },
      { x: 200, y: 640 },
      { x: 720, y: 640 },
    ],
    reliefs: [160, 340, 580, 760],
    braziers: [
      { x: 150, y: 250 },
      { x: 770, y: 250 },
    ],
    banners: [90, 830],
    props: [
      { key: TX.statueAthena, x: 95, y: 380 },
      { key: TX.statueGoddess, x: 825, y: 380 },
      { key: TX.columnGold, x: 250, y: 230 },
      { key: TX.columnGold, x: 670, y: 230 },
      { key: TX.amphora, x: 150, y: 640 },
      { key: TX.amphora, x: 770, y: 640 },
    ],
    placards: [
      { x: 460, y: 110, title: "Command Desk", subtitle: "Sit to review your empire" },
      { x: 460, y: 612, title: "Council Table", subtitle: "Sit at the head to convene" },
    ],
  },
  "temple-zeus": {
    id: "temple-zeus",
    name: "Temple of Zeus",
    width: 820,
    height: 560,
    accent: "#f5c84c",
    theme: "temple",
    rug: "#6b531a",
    entry: { x: 410, y: 490 },
    exit: { x: 410, y: 526 },
    braziers: [
      { x: 180, y: 250 },
      { x: 640, y: 250 },
      { x: 280, y: 380 },
      { x: 540, y: 380 },
    ],
    banners: [230, 410, 590],
    dais: { x: 410, y: 230, w: 220, statue: TX.statueZeus },
    props: [
      { key: TX.column, x: 130, y: 250 },
      { key: TX.column, x: 690, y: 250 },
      { key: TX.columnGold, x: 230, y: 250 },
      { key: TX.columnGold, x: 590, y: 250 },
      { key: TX.altar, x: 410, y: 330 },
      { key: TX.statueGoddess, x: 150, y: 430 },
      { key: TX.statueAthena, x: 670, y: 430 },
      { key: TX.amphora, x: 300, y: 480 },
      { key: TX.amphora, x: 520, y: 480 },
    ],
    placards: [
      { x: 410, y: 150, title: "Throne of Zeus", subtitle: "The overseer presides" },
      { x: 410, y: 410, title: "Decree Board", subtitle: "Pantheon-wide orders" },
    ],
    occupant: { oppId: "zeus", x: 410, y: 300 },
  },
};
