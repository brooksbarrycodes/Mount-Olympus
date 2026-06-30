import type { NormalizedMarket } from "../../models/normalizedMarket.ts";

interface PxSelection {
  name?: string;
  display_name?: string;
  price?: number;
  adjusted_price?: number;
  odds?: number;
  quantity?: number;
  stake?: number;
  line_id?: string;
  strike_id?: string;
}

interface PxMarket {
  id?: number;
  name?: string;
  type?: string;
  status?: string;
  selections?: PxSelection[] | PxSelection[][];
  total_quantity?: number;
}

interface PxSportEvent {
  event_id?: number;
  name?: string;
  scheduled?: string;
  tournament_id?: number;
  tournament_name?: string;
}

const MONEYLINE_TYPES = new Set(["moneyline", "sup_moneyline", "match_winner", "ml"]);
const OPEN_STATUSES = new Set(["active", "open", "listed", ""]);

/** ProphetX price is American odds; convert to implied probability. */
export function americanToProb(odds: number): number {
  if (odds === 0) return 0;
  if (odds < 0) return -odds / (-odds + 100);
  return 100 / (odds + 100);
}

function isMoneylineType(type: string | undefined): boolean {
  if (!type) return false;
  return MONEYLINE_TYPES.has(type.toLowerCase());
}

function isOpenStatus(status: string | undefined): boolean {
  if (!status) return true;
  return OPEN_STATUSES.has(status.toLowerCase());
}

/** Only map full-game moneyline — skip inning/half variants. */
function isFullGameMoneyline(market: PxMarket): boolean {
  if (!isMoneylineType(market.type)) return false;
  const label = (market.name ?? "").toLowerCase();
  if (label === "moneyline") return true;
  if (label.includes("inning") || label.includes("1st") || label.includes("5")) return false;
  return label.includes("moneyline") && !label.includes("inning");
}

/** Take the primary (best) price level per side from v2 order-book selections. */
export function flattenPxSelections(selections: PxMarket["selections"]): PxSelection[] {
  if (!selections?.length) return [];
  const first = selections[0];
  if (Array.isArray(first)) {
    return (selections as PxSelection[][])
      .map((side) => (Array.isArray(side) ? side[0] : side))
      .filter((s): s is PxSelection => s != null);
  }
  return selections as PxSelection[];
}

function selectionOdds(sel: PxSelection): number {
  return sel.adjusted_price ?? sel.price ?? sel.odds ?? 0;
}

export function mapProphetxMoneyline(
  market: PxMarket,
  event: PxSportEvent,
  sport: string,
): NormalizedMarket | null {
  if (!isFullGameMoneyline(market)) return null;
  if (!isOpenStatus(market.status)) return null;

  const flat = flattenPxSelections(market.selections);
  if (flat.length < 2) return null;

  const [yesSel, noSel] = flat;
  const yesOdds = selectionOdds(yesSel);
  const noOdds = selectionOdds(noSel);
  const yesAsk = americanToProb(yesOdds);
  const noAsk = americanToProb(noOdds);
  if (yesAsk <= 0 || noAsk <= 0) return null;

  const marketId = String(market.id ?? yesSel.line_id ?? yesSel.strike_id ?? event.event_id);
  const eventName = event.name ?? market.name ?? marketId;
  const depth = Math.min(yesSel.stake ?? yesSel.quantity ?? 0, noSel.stake ?? noSel.quantity ?? 0, market.total_quantity ?? 0);
  const strikeId = noSel.line_id ?? noSel.strike_id ?? yesSel.line_id ?? yesSel.strike_id;

  return {
    venue: "prophetx",
    dataSource: "live" as const,
    marketId: `PX-${marketId}`,
    eventId: String(event.event_id ?? marketId),
    eventName,
    sport,
    league: (event.tournament_name ?? sport).toUpperCase(),
    marketType: "binary",
    venueMeta: {
      strikeId,
      yesAmericanOdds: yesOdds,
      noAmericanOdds: noOdds,
    },
    yesAsk,
    yesBid: Math.max(0, yesAsk - 0.01),
    noAsk,
    noBid: Math.max(0, noAsk - 0.01),
    yesAskDepth: depth > 0 ? depth : 0,
    noAskDepth: depth > 0 ? depth : 0,
    startTime: event.scheduled ?? new Date().toISOString(),
    isLive: event.scheduled ? new Date(event.scheduled).getTime() <= Date.now() : false,
    resolutionText: eventName,
    overtimeIncluded: /overtime|ot/i.test(eventName),
    fetchedAt: new Date().toISOString(),
  };
}

export function inferSportFromTournament(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("nba") || n.includes("basketball")) return "basketball";
  if (n.includes("mlb") || n.includes("baseball")) return "baseball";
  if (n.includes("nfl") || n.includes("football")) return "football";
  if (n.includes("nhl") || n.includes("hockey")) return "hockey";
  return "other";
}

/** Prefer major US leagues when filtering tournaments from get_tournaments. */
export function isMajorUsSportTournament(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("mlb") ||
    n.includes("nba") ||
    n.includes("nfl") ||
    n.includes("nhl") ||
    n.includes("major league") ||
    n.includes("national basketball") ||
    n.includes("national football") ||
    n.includes("national hockey")
  );
}
