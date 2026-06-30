/** Display helpers for Kalshi / ProphetX trading desk. */

export function fmtUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return (
    sign +
    "$" +
    Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function fmtCents(prob: number): string {
  return `${Math.round(prob * 100)}¢`;
}

export function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function americanOdds(prob: number): string {
  if (prob <= 0 || prob >= 1) return "—";
  if (prob >= 0.5) {
    const v = Math.round(-100 * prob / (1 - prob));
    return String(v);
  }
  const v = Math.round(100 * (1 - prob) / prob);
  return `+${v}`;
}

export function venueLabel(venue: string): string {
  if (venue === "kalshi") return "KALSHI";
  if (venue === "prophetx") return "PROPHETX";
  return venue.toUpperCase();
}

export function fmtTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function fmtDepth(depth: number | undefined | null): string {
  if (depth == null || depth <= 0) return "—";
  return depth.toLocaleString("en-US");
}

export function strategyLabel(s: string): string {
  return s.replace(/_/g, " ");
}
