import { db, nowIso } from "./db.ts";

/**
 * Per-agent long-term memory. Simple, durable, and queryable. This is what lets
 * the Oracle accumulate findings across sessions and lets Zeus "remember" past
 * decisions. A vector store can slot in behind this same API later.
 */

export interface MemoryRow {
  id: number;
  agent: string;
  kind: string;
  content: string;
  created_at: string;
}

export function remember(agent: string, kind: string, content: string): void {
  db.prepare("INSERT INTO memory (agent, kind, content, created_at) VALUES (?, ?, ?, ?)").run(
    agent,
    kind,
    content,
    nowIso(),
  );
}

export function recall(agent: string, kind?: string, limit = 10): MemoryRow[] {
  if (kind) {
    return db
      .prepare("SELECT * FROM memory WHERE agent = ? AND kind = ? ORDER BY id DESC LIMIT ?")
      .all(agent, kind, limit) as MemoryRow[];
  }
  return db
    .prepare("SELECT * FROM memory WHERE agent = ? ORDER BY id DESC LIMIT ?")
    .all(agent, limit) as MemoryRow[];
}

export function latest(agent: string, kind: string): MemoryRow | undefined {
  return db
    .prepare("SELECT * FROM memory WHERE agent = ? AND kind = ? ORDER BY id DESC LIMIT 1")
    .get(agent, kind) as MemoryRow | undefined;
}
