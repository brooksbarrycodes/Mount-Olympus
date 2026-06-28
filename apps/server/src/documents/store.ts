import { db, nowIso } from "../core/db.ts";
import { runAgent } from "../core/agentRuntime.ts";
import { zeus } from "../agents/zeus.ts";

export type DocumentKind = "research" | "plan" | "list" | "memo";
export type DocumentStatus = "queued" | "working" | "complete" | "failed";

export interface Document {
  id: number;
  title: string;
  kind: DocumentKind;
  status: DocumentStatus;
  contentMd: string;
  summary: string;
  requestedBy: string;
  agent: string;
  sessionId: number | null;
  createdAt: string;
  completedAt: string | null;
}

export function createDocument(opts: {
  title: string;
  kind?: DocumentKind;
  requestedBy?: string;
}): Document {
  const r = db
    .prepare(
      `INSERT INTO documents
        (title, kind, status, content_md, summary, requested_by, agent, created_at)
       VALUES (?, ?, 'queued', '', '', ?, 'zeus', ?)`,
    )
    .run(opts.title, opts.kind ?? "research", opts.requestedBy ?? "user", nowIso());
  return getDocument(Number(r.lastInsertRowid))!;
}

export function getDocument(id: number): Document | undefined {
  const row = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? rowToDoc(row) : undefined;
}

export function listDocuments(limit = 50): Document[] {
  const rows = db
    .prepare(`SELECT * FROM documents ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as Array<Record<string, unknown>>;
  return rows.map(rowToDoc);
}

export function updateDocument(
  id: number,
  patch: Partial<Pick<Document, "status" | "contentMd" | "summary" | "completedAt">>,
): void {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.status != null) {
    sets.push("status = ?");
    vals.push(patch.status);
  }
  if (patch.contentMd != null) {
    sets.push("content_md = ?");
    vals.push(patch.contentMd);
  }
  if (patch.summary != null) {
    sets.push("summary = ?");
    vals.push(patch.summary);
  }
  if (patch.completedAt != null) {
    sets.push("completed_at = ?");
    vals.push(patch.completedAt);
  }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE documents SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

function rowToDoc(row: Record<string, unknown>): Document {
  return {
    id: Number(row.id),
    title: String(row.title),
    kind: row.kind as DocumentKind,
    status: row.status as DocumentStatus,
    contentMd: String(row.content_md),
    summary: String(row.summary),
    requestedBy: String(row.requested_by),
    agent: String(row.agent),
    sessionId: row.session_id == null ? null : Number(row.session_id),
    createdAt: String(row.created_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
  };
}

export async function startResearch(topic: string, kind: DocumentKind = "research"): Promise<Document> {
  const doc = createDocument({ title: topic.slice(0, 120), kind, requestedBy: "user" });
  void runResearchJob(doc.id, topic, kind);
  return doc;
}

async function runResearchJob(id: number, topic: string, kind: DocumentKind): Promise<void> {
  updateDocument(id, { status: "working" });
  try {
    const prompt =
      kind === "list"
        ? `Research and produce a detailed markdown list for: ${topic}. Use headings and bullet points. Be thorough and cite sources where possible.`
        : kind === "plan"
          ? `Create a strategic markdown plan for: ${topic}. Include phases, milestones, risks, and next actions.`
          : `Write a thorough markdown research report on: ${topic}. Include executive summary, key findings, and recommendations.`;

    const result = await runAgent(zeus, prompt);
    const content = result.text;
    const summary = content.split("\n").find((l) => l.trim().length > 20)?.slice(0, 200) ?? content.slice(0, 200);
    updateDocument(id, {
      status: "complete",
      contentMd: content,
      summary,
      completedAt: nowIso(),
    });
  } catch (err) {
    updateDocument(id, {
      status: "failed",
      contentMd: `Research failed: ${String(err)}`,
      summary: "Failed",
      completedAt: nowIso(),
    });
  }
}
