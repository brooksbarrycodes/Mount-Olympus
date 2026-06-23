import { db, nowIso } from "./db.ts";

/**
 * Every action an agent proposes or takes is written here: who, what, when,
 * cost, and outcome. This is how Zeus "watches everything," how the trust
 * ladder measures track record, and how you review what happened overnight.
 */

export type AuditStatus = "proposed" | "executed" | "blocked" | "approved" | "rejected";

export interface AuditEntry {
  id: number;
  agent: string;
  action: string;
  detail: string;
  cost: number;
  status: AuditStatus;
  approver: string | null;
  created_at: string;
}

export function record(entry: {
  agent: string;
  action: string;
  detail?: unknown;
  cost?: number;
  status: AuditStatus;
  approver?: string | null;
}): number {
  const info = db
    .prepare(
      "INSERT INTO audit_log (agent, action, detail, cost, status, approver, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      entry.agent,
      entry.action,
      JSON.stringify(entry.detail ?? {}),
      entry.cost ?? 0,
      entry.status,
      entry.approver ?? null,
      nowIso(),
    );
  return Number(info.lastInsertRowid);
}

export function list(limit = 50): AuditEntry[] {
  return db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?").all(limit) as AuditEntry[];
}

export function listSince(iso: string): AuditEntry[] {
  return db
    .prepare("SELECT * FROM audit_log WHERE created_at >= ? ORDER BY id DESC")
    .all(iso) as AuditEntry[];
}

/** Track record for a given action type, used by the trust ladder. */
export function trackRecord(action: string): {
  approved: number;
  rejected: number;
  total: number;
} {
  const approved = (
    db
      .prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = ? AND status = 'approved'")
      .get(action) as { n: number }
  ).n;
  const rejected = (
    db
      .prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = ? AND status = 'rejected'")
      .get(action) as { n: number }
  ).n;
  return { approved, rejected, total: approved + rejected };
}
