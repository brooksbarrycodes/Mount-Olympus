import { db, nowIso } from "../core/db.ts";
import { recordCost } from "./ledger.ts";
import type { TreasuryCategory } from "./ledger.ts";

export interface RecurringCost {
  id: number;
  label: string;
  amountUsd: number;
  cadence: string;
  category: TreasuryCategory;
  attributedGodId: string;
  nextAccrueAt: string;
  active: boolean;
}

export function addRecurring(opts: {
  label: string;
  amountUsd: number;
  category?: TreasuryCategory;
  attributedGodId?: string;
}): number {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  const r = db
    .prepare(
      `INSERT INTO treasury_recurring
        (label, amount_usd, cadence, category, attributed_god_id, next_accrue_at, active, created_at)
       VALUES (?, ?, 'monthly', ?, ?, ?, 1, ?)`,
    )
    .run(
      opts.label,
      opts.amountUsd,
      opts.category ?? "subscription",
      opts.attributedGodId ?? "archon",
      next.toISOString(),
      nowIso(),
    );
  return Number(r.lastInsertRowid);
}

export function listRecurring(): RecurringCost[] {
  const rows = db
    .prepare(`SELECT * FROM treasury_recurring WHERE active = 1 ORDER BY label`)
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: Number(r.id),
    label: String(r.label),
    amountUsd: Number(r.amount_usd),
    cadence: String(r.cadence),
    category: r.category as TreasuryCategory,
    attributedGodId: String(r.attributed_god_id),
    nextAccrueAt: String(r.next_accrue_at),
    active: Boolean(r.active),
  }));
}

/** Accrue any recurring costs whose next_accrue_at has passed. */
export function accrueRecurring(): number {
  const now = nowIso();
  const due = db
    .prepare(`SELECT * FROM treasury_recurring WHERE active = 1 AND next_accrue_at <= ?`)
    .all(now) as Array<Record<string, unknown>>;
  let count = 0;
  for (const row of due) {
    recordCost({
      label: String(row.label),
      amountUsd: Number(row.amount_usd),
      category: row.category as TreasuryCategory,
      attributedGodId: String(row.attributed_god_id),
      source: "recurring",
      reference: `recurring:${row.id}`,
    });
    const next = new Date(String(row.next_accrue_at));
    next.setMonth(next.getMonth() + 1);
    db.prepare(`UPDATE treasury_recurring SET next_accrue_at = ? WHERE id = ?`).run(
      next.toISOString(),
      row.id,
    );
    count++;
  }
  return count;
}
