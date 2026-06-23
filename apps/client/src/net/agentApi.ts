/**
 * Typed client for the Olympus agent server (apps/server). The game talks to
 * the real agents through here. Base URL defaults to the local dev server and
 * can be overridden with VITE_AGENT_API.
 *
 * Every call can throw (e.g. server down); callers that need graceful
 * degradation should catch and fall back to offline behavior.
 */

const BASE =
  (import.meta.env.VITE_AGENT_API as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8787";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export interface BusinessView {
  id: string;
  name: string;
  godId: string;
  god: string;
  platform: string;
  niche: string | null;
  status: string;
  monthlyBudget: number;
  revenue: number;
  expenses: number;
  orders: number;
  profit: number;
  margin: number;
  budgetRemaining: number;
  revenueSeries: number[];
}

export interface LedgerTotals {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  orders: number;
}

export interface GuardrailState {
  killSwitch: boolean;
  marginFloor: number;
  dailyBudgetCapUsd: number;
  publishRateLimitPerDay: number;
  spendToday: number;
}

export interface ServerState {
  adapterMode: "mock" | "real";
  llmLive: boolean;
  guardrails: GuardrailState;
  autonomy: Record<string, number>;
  totals: LedgerTotals;
  llm: { spendThisMonth: number; monthlyBudgetUsd: number };
}

export interface AuditEntry {
  id: number;
  agent: string;
  action: string;
  detail: string;
  cost: number;
  status: string;
  approver: string | null;
  created_at: string;
}

export interface Approval {
  id: number;
  agent: string;
  businessId: string | null;
  actionType: string;
  summary: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface Prediction {
  id: number;
  topic: string;
  prediction: string;
  confidence: number;
  created_at: string;
  resolved: number;
  outcome: string | null;
  score: number | null;
}

export const agentApi = {
  base: BASE,

  zeusMessage: (message: string) =>
    post<{ reply: string; toolsUsed: string[]; costUsd: number }>("/zeus/message", { message }),

  oracleAnalyze: (question: string) =>
    post<{ report: string; toolsUsed: string[]; costUsd: number }>("/oracle/analyze", { question }),

  oracleReport: () => get<{ report: string; generatedAt: string; fresh: boolean }>("/oracle/report"),

  oracleDaily: () => post<{ report: string }>("/oracle/daily", {}),

  predictions: () =>
    get<{ predictions: Prediction[]; score: { total: number; resolved: number; avgScore: number | null } }>(
      "/oracle/predictions",
    ),

  produce: (niche?: string) => post<{ result: string; toolsUsed: string[] }>("/apollo/produce", { niche }),

  ledger: () => get<{ businesses: BusinessView[]; totals: LedgerTotals }>("/ledger"),

  audit: () => get<{ entries: AuditEntry[] }>("/audit"),

  state: () => get<ServerState>("/state"),

  approvals: (all = false) => get<{ approvals: Approval[] }>(`/approvals${all ? "?all=1" : ""}`),

  approve: (id: number) => post<{ ok: boolean; error?: string; violations?: string[] }>(
    `/approvals/${id}/approve`,
    {},
  ),

  reject: (id: number) => post<{ ok: boolean }>(`/approvals/${id}/reject`, {}),

  kill: (on: boolean) => post<{ ok: boolean; killSwitch: boolean }>("/kill", { on }),

  setAutonomy: (actionType: string, level: number) =>
    post<{ ok: boolean }>("/autonomy", { actionType, level }),

  /** Route a chat message to the right agent. Returns null if the opp has no backend agent. */
  async replyFor(oppId: string, text: string): Promise<string | null> {
    if (oppId === "zeus") return (await this.zeusMessage(text)).reply;
    if (oppId === "oracle") return (await this.oracleAnalyze(text)).report;
    if (oppId === "apollo") return (await this.produce()).result;
    return null;
  },
};
