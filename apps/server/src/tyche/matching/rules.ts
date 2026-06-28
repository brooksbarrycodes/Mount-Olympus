import type { NormalizedMarket } from "../models/normalizedMarket.ts";
import type { MatchConfidence, MatchedPair } from "../models/marketMatch.ts";

const START_TOLERANCE_MS = 15 * 60 * 1000;

export function normalizeEventKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(to win|will win|moneyline|ml)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function eventsMatch(a: NormalizedMarket, b: NormalizedMarket): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (a.sport !== b.sport) {
    reasons.push(`sport mismatch: ${a.sport} vs ${b.sport}`);
    return { ok: false, reasons };
  }
  const keyA = normalizeEventKey(a.eventName);
  const keyB = normalizeEventKey(b.eventName);
  if (keyA !== keyB && !keyA.includes(keyB) && !keyB.includes(keyA)) {
    reasons.push(`event name mismatch: "${a.eventName}" vs "${b.eventName}"`);
    return { ok: false, reasons };
  }
  const startA = new Date(a.startTime).getTime();
  const startB = new Date(b.startTime).getTime();
  if (Math.abs(startA - startB) > START_TOLERANCE_MS) {
    reasons.push("start time outside tolerance");
    return { ok: false, reasons };
  }
  if (a.overtimeIncluded !== b.overtimeIncluded) {
    reasons.push("overtime rule mismatch");
    return { ok: false, reasons };
  }
  reasons.push("sport match", "participants match", "start time within tolerance", "overtime rules match");
  return { ok: true, reasons };
}

export function scoreMatch(a: NormalizedMarket, b: NormalizedMarket): MatchConfidence {
  if (a.marketType !== "binary" || b.marketType !== "binary") return "NOT_MATCH";
  const { ok } = eventsMatch(a, b);
  if (!ok) return "NOT_MATCH";
  const resA = a.resolutionText.toLowerCase().replace(/\s+/g, " ").trim();
  const resB = b.resolutionText.toLowerCase().replace(/\s+/g, " ").trim();
  if (resA === resB || resA.includes(resB) || resB.includes(resA)) return "EXACT_MATCH";
  return "PROBABLE_MATCH";
}

export function buildPair(
  kalshi: NormalizedMarket,
  px: NormalizedMarket,
  confidence: MatchConfidence,
  reasons: string[],
): MatchedPair {
  return {
    kalshiMarketId: kalshi.marketId,
    prophetxMarketId: px.marketId,
    confidence,
    reasons,
    eventName: kalshi.eventName,
    sport: kalshi.sport,
    legA: { venue: "kalshi", side: "yes" },
    legB: { venue: "prophetx", side: "no" },
  };
}
