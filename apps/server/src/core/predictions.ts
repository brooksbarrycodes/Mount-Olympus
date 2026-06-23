import { db, nowIso } from "./db.ts";

/**
 * The Oracle's prediction scoreboard. Every forecast is logged, then later
 * compared against real ledger outcomes. This keeps her (and you) honest about
 * whether her "divination" is actually any good.
 */

export interface PredictionRow {
  id: number;
  agent: string;
  topic: string;
  prediction: string;
  confidence: number;
  business_id: string | null;
  created_at: string;
  resolved: number;
  outcome: string | null;
  score: number | null;
}

export function recordPrediction(input: {
  agent: string;
  topic: string;
  prediction: string;
  confidence?: number;
  businessId?: string | null;
}): number {
  const info = db
    .prepare(
      `INSERT INTO predictions (agent, topic, prediction, confidence, business_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.agent,
      input.topic,
      input.prediction,
      input.confidence ?? 0.5,
      input.businessId ?? null,
      nowIso(),
    );
  return Number(info.lastInsertRowid);
}

export function resolvePrediction(id: number, outcome: string, score: number): void {
  db.prepare("UPDATE predictions SET resolved = 1, outcome = ?, score = ? WHERE id = ?").run(
    outcome,
    score,
    id,
  );
}

export function listPredictions(agent: string, limit = 20): PredictionRow[] {
  return db
    .prepare("SELECT * FROM predictions WHERE agent = ? ORDER BY id DESC LIMIT ?")
    .all(agent, limit) as PredictionRow[];
}

export interface PredictionScore {
  total: number;
  resolved: number;
  avgScore: number | null;
}

export function predictionScore(agent: string): PredictionScore {
  const total = (
    db.prepare("SELECT COUNT(*) AS n FROM predictions WHERE agent = ?").get(agent) as { n: number }
  ).n;
  const resolvedRow = db
    .prepare(
      "SELECT COUNT(*) AS n, AVG(score) AS avg FROM predictions WHERE agent = ? AND resolved = 1",
    )
    .get(agent) as { n: number; avg: number | null };
  return { total, resolved: resolvedRow.n, avgScore: resolvedRow.avg };
}
