import { db, nowIso } from "./db.ts";
import type { LlmMessage } from "./llm/types.ts";

export const DEFAULT_SESSION_TITLE = "New chat";

export interface ChatSessionRow {
  id: number;
  agent: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface SessionSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string | null;
}

export interface SessionWithMessages extends SessionSummary {
  messages: { role: "user" | "assistant"; content: string; createdAt: string }[];
}

export function createSession(agent: string, title = DEFAULT_SESSION_TITLE): SessionSummary {
  const ts = nowIso();
  const result = db
    .prepare(
      "INSERT INTO chat_sessions (agent, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run(agent, title, ts, ts);
  const id = Number(result.lastInsertRowid);
  return {
    id,
    title,
    createdAt: ts,
    updatedAt: ts,
    messageCount: 0,
    preview: null,
  };
}

export function getSession(id: number): ChatSessionRow | undefined {
  return db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(id) as ChatSessionRow | undefined;
}

export function sessionBelongsToAgent(id: number, agent: string): boolean {
  const row = getSession(id);
  return row?.agent === agent;
}

export function listSessions(agent: string, limit = 50): SessionSummary[] {
  const rows = db
    .prepare(
      `SELECT s.id, s.title, s.created_at, s.updated_at,
              (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS message_count,
              (SELECT content FROM chat_messages m
               WHERE m.session_id = s.id AND m.role = 'user'
               ORDER BY m.id ASC LIMIT 1) AS preview
       FROM chat_sessions s
       WHERE s.agent = ?
       ORDER BY s.updated_at DESC
       LIMIT ?`,
    )
    .all(agent, limit) as {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    preview: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    messageCount: r.message_count,
    preview: r.preview,
  }));
}

export function listMessages(sessionId: number): ChatMessageRow[] {
  return db
    .prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC")
    .all(sessionId) as ChatMessageRow[];
}

export function getSessionWithMessages(sessionId: number): SessionWithMessages | undefined {
  const session = getSession(sessionId);
  if (!session) return undefined;
  const messages = listMessages(sessionId);
  const preview = messages.find((m) => m.role === "user")?.content ?? null;
  return {
    id: session.id,
    title: session.title,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    messageCount: messages.length,
    preview,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })),
  };
}

export function appendMessage(
  sessionId: number,
  role: "user" | "assistant",
  content: string,
): ChatMessageRow {
  const ts = nowIso();
  const result = db
    .prepare(
      "INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(sessionId, role, content, ts);
  db.prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").run(ts, sessionId);
  return {
    id: Number(result.lastInsertRowid),
    session_id: sessionId,
    role,
    content,
    created_at: ts,
  };
}

export function setSessionTitle(sessionId: number, title: string): void {
  db.prepare("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?").run(
    title,
    nowIso(),
    sessionId,
  );
}

/** Map stored turns into LLM messages for multi-turn context (excludes current user msg). */
export function getRecentContext(sessionId: number, maxTurns = 40): LlmMessage[] {
  const rows = db
    .prepare(
      `SELECT role, content FROM chat_messages
       WHERE session_id = ?
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(sessionId, maxTurns * 2) as { role: "user" | "assistant"; content: string }[];

  return rows
    .reverse()
    .map((r) =>
      r.role === "user"
        ? ({ role: "user" as const, content: r.content })
        : ({ role: "assistant" as const, content: r.content }),
    );
}

export function heuristicTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.replace(/\s+/g, " ").trim();
  if (!trimmed) return DEFAULT_SESSION_TITLE;
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 45)}…`;
}
