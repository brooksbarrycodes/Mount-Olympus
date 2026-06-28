import { db, nowIso, kvGet, kvSet } from "./db.ts";
import * as audit from "./auditLog.ts";
import { checkPublish, type PublishPayload } from "./guardrails.ts";
import { recordExpense } from "./ledger.ts";

/**
 * The approval queue and the trust ladder.
 *
 * Workers never act directly; they enqueue a proposal here. By default every
 * action type sits at autonomy Level 1 (you approve each one). The ladder logic
 * exists so you can later let proven action types auto-approve - but it is OFF
 * until you raise the level yourself (cautious mode).
 *
 *   Level 0: disabled (nothing happens)
 *   Level 1: manual - you approve every one          <- DEFAULT
 *   Level 2: auto IF guardrails pass AND track record is clean, else escalate
 *   Level 3: full auto if guardrails pass
 */

export type AutonomyLevel = 0 | 1 | 2 | 3;

export interface ApprovalRow {
  id: number;
  agent: string;
  business_id: string | null;
  action_type: string;
  summary: string;
  payload: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface ApprovalView {
  id: number;
  agent: string;
  businessId: string | null;
  actionType: string;
  summary: string;
  payload: Record<string, unknown>;
  status: ApprovalRow["status"];
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

function view(row: ApprovalRow): ApprovalView {
  return {
    id: row.id,
    agent: row.agent,
    businessId: row.business_id,
    actionType: row.action_type,
    summary: row.summary,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
  };
}

const TRUST_THRESHOLD = 20; // clean approvals needed before Level 2 auto-acts

export function getAutonomyLevel(actionType: string): AutonomyLevel {
  const raw = kvGet(`autonomy:${actionType}`);
  const n = raw === undefined ? 1 : Number(raw);
  return ([0, 1, 2, 3].includes(n) ? n : 1) as AutonomyLevel;
}

export function setAutonomyLevel(actionType: string, level: AutonomyLevel): void {
  kvSet(`autonomy:${actionType}`, String(level));
}

export interface CreateApprovalInput {
  agent: string;
  businessId?: string | null;
  actionType: string;
  summary: string;
  payload?: Record<string, unknown>;
}

export interface CreateApprovalResult {
  approval: ApprovalView;
  autoDecided: boolean;
}

/**
 * Enqueue a worker proposal. Honors the trust ladder: at Level 1 it always
 * stays pending for your review. Higher levels may auto-approve, but only if
 * guardrails pass.
 */
export function createApproval(input: CreateApprovalInput): CreateApprovalResult {
  const payload = input.payload ?? {};
  const info = db
    .prepare(
      `INSERT INTO approvals (agent, business_id, action_type, summary, payload, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      input.agent,
      input.businessId ?? null,
      input.actionType,
      input.summary,
      JSON.stringify(payload),
      nowIso(),
    );
  const id = Number(info.lastInsertRowid);

  audit.record({
    agent: input.agent,
    action: `propose:${input.actionType}`,
    detail: { approvalId: id, summary: input.summary },
    status: "proposed",
  });

  const level = getAutonomyLevel(input.actionType);
  let autoDecided = false;
  if (level >= 2) {
    const guard = checkPublish(payload as PublishPayload);
    const record = audit.trackRecord(input.actionType);
    const trusted = level === 3 || record.total >= TRUST_THRESHOLD;
    if (guard.ok && trusted) {
      decide(id, "approved", "auto");
      autoDecided = true;
    }
  }

  const row = db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as ApprovalRow;
  return { approval: view(row), autoDecided };
}

export function listPending(): ApprovalView[] {
  const rows = db
    .prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY id DESC")
    .all() as ApprovalRow[];
  return rows.map(view);
}

export function listAll(limit = 50): ApprovalView[] {
  const rows = db
    .prepare("SELECT * FROM approvals ORDER BY id DESC LIMIT ?")
    .all(limit) as ApprovalRow[];
  return rows.map(view);
}

export interface DecisionResult {
  ok: boolean;
  approval?: ApprovalView;
  error?: string;
  violations?: string[];
}

/**
 * Approve or reject a pending proposal. Approval still runs the action through
 * the guardrails; a violation blocks execution even though you said yes.
 */
export function decide(
  id: number,
  decision: "approved" | "rejected",
  approver: string,
): DecisionResult {
  const row = db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as ApprovalRow | undefined;
  if (!row) return { ok: false, error: "approval not found" };
  if (row.status !== "pending") return { ok: false, error: `already ${row.status}` };

  const payload = JSON.parse(row.payload) as Record<string, unknown>;

  if (decision === "approved") {
    const guard = checkPublish(payload as PublishPayload);
    if (!guard.ok) {
      audit.record({
        agent: row.agent,
        action: "publish",
        detail: { approvalId: id, blocked: guard.violations },
        status: "blocked",
        approver,
      });
      return { ok: false, error: "blocked by guardrails", violations: guard.violations };
    }
    // "Execute" the action: record the listing's cost as a real expense.
    const spend = Number(payload.spend ?? payload.cost ?? 0);
    if (spend > 0) recordExpense(row.business_id, `Listing cost (${row.action_type})`, spend, row.agent);
    // Real mode never fabricates revenue - that arrives from real sales.
    audit.record({
      agent: row.agent,
      action: "publish",
      detail: { approvalId: id, summary: row.summary },
      cost: spend,
      status: "approved",
      approver,
    });
  } else {
    audit.record({
      agent: row.agent,
      action: "publish",
      detail: { approvalId: id, summary: row.summary },
      status: "rejected",
      approver,
    });
  }

  db.prepare("UPDATE approvals SET status = ?, decided_at = ?, decided_by = ? WHERE id = ?").run(
    decision,
    nowIso(),
    approver,
    id,
  );
  const updated = db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as ApprovalRow;
  return { ok: true, approval: view(updated) };
}

export function autonomySnapshot(actionTypes: string[]): Record<string, AutonomyLevel> {
  const out: Record<string, AutonomyLevel> = {};
  for (const t of actionTypes) out[t] = getAutonomyLevel(t);
  return out;
}
