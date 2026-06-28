import { db, nowIso } from "../core/db.ts";

export function initTreasurySchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS treasury_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      attributed_god_id TEXT NOT NULL DEFAULT 'archon',
      source TEXT NOT NULL DEFAULT 'manual',
      reference TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS treasury_recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      cadence TEXT NOT NULL DEFAULT 'monthly',
      category TEXT NOT NULL DEFAULT 'subscription',
      attributed_god_id TEXT NOT NULL DEFAULT 'archon',
      next_accrue_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_at TEXT,
      completed_at TEXT,
      created_by TEXT NOT NULL DEFAULT 'user',
      linear_issue_id TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'research',
      status TEXT NOT NULL DEFAULT 'queued',
      content_md TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      requested_by TEXT NOT NULL DEFAULT 'user',
      agent TEXT NOT NULL DEFAULT 'zeus',
      session_id INTEGER,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_treasury_created ON treasury_entries(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(completed_at, due_at);
    CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
  `);
}

export { nowIso };
