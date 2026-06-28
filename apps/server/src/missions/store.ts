import { db, nowIso } from "../core/db.ts";

export interface Mission {
  id: number;
  title: string;
  description: string;
  dueAt: string | null;
  completedAt: string | null;
  createdBy: string;
  linearIssueId: string | null;
  priority: number;
  createdAt: string;
}

export function parseDueFromHours(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function parseDueFromDays(days: number): string {
  return parseDueFromHours(days * 24);
}

export function createMission(opts: {
  title: string;
  description?: string;
  dueAt?: string | null;
  createdBy?: string;
  linearIssueId?: string | null;
  priority?: number;
}): Mission {
  const r = db
    .prepare(
      `INSERT INTO missions
        (title, description, due_at, created_by, linear_issue_id, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.title,
      opts.description ?? "",
      opts.dueAt ?? null,
      opts.createdBy ?? "user",
      opts.linearIssueId ?? null,
      opts.priority ?? 0,
      nowIso(),
    );
  return getMission(Number(r.lastInsertRowid))!;
}

export function getMission(id: number): Mission | undefined {
  const row = db.prepare(`SELECT * FROM missions WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? rowToMission(row) : undefined;
}

export function listMissions(includeCompleted = false): Mission[] {
  const sql = includeCompleted
    ? `SELECT * FROM missions ORDER BY completed_at IS NOT NULL, due_at ASC, created_at DESC`
    : `SELECT * FROM missions WHERE completed_at IS NULL ORDER BY due_at ASC, created_at DESC`;
  const rows = db.prepare(sql).all() as Array<Record<string, unknown>>;
  return rows.map(rowToMission);
}

export function completeMission(id: number): Mission | undefined {
  db.prepare(`UPDATE missions SET completed_at = ? WHERE id = ?`).run(nowIso(), id);
  return getMission(id);
}

export function deleteMission(id: number): void {
  db.prepare(`DELETE FROM missions WHERE id = ?`).run(id);
}

function rowToMission(row: Record<string, unknown>): Mission {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: String(row.description),
    dueAt: row.due_at == null ? null : String(row.due_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
    createdBy: String(row.created_by),
    linearIssueId: row.linear_issue_id == null ? null : String(row.linear_issue_id),
    priority: Number(row.priority),
    createdAt: String(row.created_at),
  };
}

export function timeRemainingMs(dueAt: string | null): number | null {
  if (!dueAt) return null;
  return new Date(dueAt).getTime() - Date.now();
}
