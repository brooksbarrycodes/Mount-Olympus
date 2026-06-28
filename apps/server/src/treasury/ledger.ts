import { db, nowIso } from "../core/db.ts";

export type TreasuryKind = "cost" | "credit";
export type TreasuryCategory = "api" | "subscription" | "infra" | "trading" | "other";
export type TreasurySource = "auto" | "manual" | "recurring" | "zeus";

export interface TreasuryEntry {
  id: number;
  kind: TreasuryKind;
  label: string;
  amountUsd: number;
  category: TreasuryCategory;
  attributedGodId: string;
  source: TreasurySource;
  reference: string | null;
  createdAt: string;
}

export interface TreasurySummary {
  balance: number;
  totalCosts: number;
  totalCredits: number;
  weekNet: number;
  monthNet: number;
  allTimeProfit: number;
  negative: boolean;
}

function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function netSince(since: string): number {
  const rows = db
    .prepare(
      `SELECT kind, amount_usd FROM treasury_entries WHERE created_at >= ?`,
    )
    .all(since) as Array<{ kind: string; amount_usd: number }>;
  let net = 0;
  for (const r of rows) {
    if (r.kind === "credit") net += r.amount_usd;
    else net -= r.amount_usd;
  }
  return net;
}

function totals(): { costs: number; credits: number } {
  const rows = db
    .prepare(`SELECT kind, COALESCE(SUM(amount_usd), 0) AS s FROM treasury_entries GROUP BY kind`)
    .all() as Array<{ kind: string; s: number }>;
  let costs = 0;
  let credits = 0;
  for (const r of rows) {
    if (r.kind === "credit") credits = r.s;
    else costs = r.s;
  }
  return { costs, credits };
}

export function treasurySummary(): TreasurySummary {
  const { costs, credits } = totals();
  const balance = credits - costs;
  return {
    balance,
    totalCosts: costs,
    totalCredits: credits,
    weekNet: netSince(startOfWeekIso()),
    monthNet: netSince(startOfMonthIso()),
    allTimeProfit: balance,
    negative: balance < 0,
  };
}

export function recordCost(opts: {
  label: string;
  amountUsd: number;
  category?: TreasuryCategory;
  attributedGodId?: string;
  source?: TreasurySource;
  reference?: string;
}): number {
  const r = db
    .prepare(
      `INSERT INTO treasury_entries
        (kind, label, amount_usd, category, attributed_god_id, source, reference, created_at)
       VALUES ('cost', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.label,
      opts.amountUsd,
      opts.category ?? "other",
      opts.attributedGodId ?? "archon",
      opts.source ?? "manual",
      opts.reference ?? null,
      nowIso(),
    );
  return Number(r.lastInsertRowid);
}

export function recordCredit(opts: {
  label: string;
  amountUsd: number;
  category?: TreasuryCategory;
  attributedGodId?: string;
  source?: TreasurySource;
  reference?: string;
}): number {
  const r = db
    .prepare(
      `INSERT INTO treasury_entries
        (kind, label, amount_usd, category, attributed_god_id, source, reference, created_at)
       VALUES ('credit', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.label,
      opts.amountUsd,
      opts.category ?? "other",
      opts.attributedGodId ?? "archon",
      opts.source ?? "manual",
      opts.reference ?? null,
      nowIso(),
    );
  return Number(r.lastInsertRowid);
}

export function listEntries(opts: {
  since?: string;
  god?: string;
  limit?: number;
}): TreasuryEntry[] {
  let sql = `SELECT * FROM treasury_entries WHERE 1=1`;
  const params: unknown[] = [];
  if (opts.since) {
    sql += ` AND created_at >= ?`;
    params.push(opts.since);
  }
  if (opts.god) {
    sql += ` AND attributed_god_id = ?`;
    params.push(opts.god);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(opts.limit ?? 100);
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return rows.map(rowToEntry);
}

function rowToEntry(row: Record<string, unknown>): TreasuryEntry {
  return {
    id: Number(row.id),
    kind: row.kind as TreasuryKind,
    label: String(row.label),
    amountUsd: Number(row.amount_usd),
    category: row.category as TreasuryCategory,
    attributedGodId: String(row.attributed_god_id),
    source: row.source as TreasurySource,
    reference: row.reference == null ? null : String(row.reference),
    createdAt: String(row.created_at),
  };
}
