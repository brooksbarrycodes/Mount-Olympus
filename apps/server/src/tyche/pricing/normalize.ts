export function probToCents(p: number): number {
  return Math.round(p * 100);
}

export function centsToProb(c: number): number {
  return c / 100;
}

export function americanOdds(prob: number): number {
  if (prob >= 0.5) return Math.round(-100 * prob / (1 - prob));
  return Math.round(100 * (1 - prob) / prob);
}
