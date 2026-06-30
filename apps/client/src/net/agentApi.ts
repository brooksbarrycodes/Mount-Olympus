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
  (import.meta.env.PROD ? "/api" : "http://localhost:8787");

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    let msg = `POST ${path} -> ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) msg = err.error;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`PATCH ${path} -> ${res.status}`);
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

export interface ZeusMessageResponse {
  reply: string;
  toolsUsed: string[];
  costUsd: number;
  provider: "mock" | "anthropic";
  llmLive: boolean;
  sessionId?: number;
}

export interface ZeusSessionSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string | null;
}

export interface ZeusSessionDetail extends ZeusSessionSummary {
  messages: { role: "user" | "assistant"; content: string; createdAt: string }[];
}

export interface TycheOpportunityLeg {
  venue: "kalshi" | "prophetx";
  marketId: string;
  side: "yes" | "no";
  askPrice: number;
  depth: number;
}

export interface TycheTradeLeg {
  venue: string;
  marketId: string;
  side: "yes" | "no";
  price: number;
  quantity: number;
  orderId: string | null;
  status: string;
  feeUsd?: number | null;
  filledQty?: number;
}

export interface TycheTradeBundle {
  id?: number;
  status: "pending" | "success" | "failed";
  strategy: string;
  eventName: string;
  sport: string;
  lockedProfitUsd: number;
  actualPnlUsd: number | null;
  failureReason: string | null;
  legs: TycheTradeLeg[];
  createdAt?: string;
}

export interface TycheOpportunity {
  id?: number;
  eventName: string;
  sport: string;
  strategyTag: "live" | "static";
  matchConfidence?: string;
  legA?: TycheOpportunityLeg;
  legB?: TycheOpportunityLeg;
  bundleCost?: number;
  grossEdge?: number;
  netEdge: number;
  worstCaseProfitUsd?: number;
  worstCaseRoi: number;
  maxSize: number;
  priorityScore?: number;
  shouldExecute: boolean;
  rejectionReasons?: string[];
  createdAt?: string;
}

export interface TycheStatus {
  mode: string;
  strategy: string;
  autoExecution: boolean;
  paused: boolean;
  lastScanAt: string | null;
  opportunities: TycheOpportunity[];
  todayPnlUsd: number;
  balances: {
    kalshi: { availableUsd: number; totalUsd: number };
    prophetx: { availableUsd: number; totalUsd: number };
    freeUsd: number;
    deployedUsd: number;
  } | null;
  venueHealth: {
    kalshi: { connected: boolean; message: string; mode: string; dataSource?: string };
    prophetx: { connected: boolean; message: string; status: string; dataSource?: string };
  } | null;
  session?: TycheSessionStatus;
}

export interface TycheSessionStatus {
  active: boolean;
  remainingMs: number | null;
  ordersPlaced: number;
  ordersCap: number;
  notionalUsd: number;
  notionalCap: number;
  session: {
    id: number;
    status: string;
    mode: string;
    strategy: string;
    startedAt: string | null;
    endsAt: string | null;
    stopReason: string | null;
  } | null;
}

export interface TychePreflight {
  ready: boolean;
  sessionMode?: "observe" | "paper" | "sandbox" | "live";
  reasons: string[];
  kalshiMarkets: number;
  prophetxMarkets: number;
  diagnostics?: {
    kalshi: {
      dataSource: string;
      message: string;
      marketCount: number;
      rawCount?: number;
      mappedCount?: number;
    };
    prophetx: {
      dataSource: string;
      message: string;
      marketCount: number;
      rawCount?: number;
      mappedCount?: number;
      tournamentsQueried?: number;
      eventsFound?: number;
    };
  };
}

export interface TycheSystemEvent {
  id: number;
  kind: string;
  detail: Record<string, unknown>;
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

export interface TreasuryEntry {
  id: number;
  kind: "cost" | "credit";
  label: string;
  amountUsd: number;
  category: string;
  attributedGodId: string;
  source: string;
  reference: string | null;
  createdAt: string;
}

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

export interface DocumentRecord {
  id: number;
  title: string;
  kind: string;
  status: string;
  contentMd: string;
  summary: string;
  requestedBy: string;
  agent: string;
  createdAt: string;
  completedAt: string | null;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  state: string;
  priority: number;
  dueDate: string | null;
  url: string;
  assignee: string | null;
}

export const agentApi = {
  base: BASE,

  zeusSessions: () => get<{ sessions: ZeusSessionSummary[] }>("/zeus/sessions"),

  zeusNewSession: () => post<{ session: ZeusSessionSummary }>("/zeus/sessions", {}),

  zeusSession: (id: number) => get<{ session: ZeusSessionDetail }>(`/zeus/sessions/${id}`),

  zeusMessage: (sessionId: number, message: string) =>
    post<ZeusMessageResponse>("/zeus/message", { sessionId, message }),

  zeusOpening: (sessionId: number) =>
    post<{ text: string; sessionId: number }>("/zeus/opening", { sessionId }),

  async zeusTts(text: string): Promise<Blob> {
    const res = await fetch(`${BASE}/zeus/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      let msg = `POST /zeus/tts -> ${res.status}`;
      try {
        const err = (await res.json()) as { error?: string };
        if (err.error) msg = err.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mpeg";
    return new Blob([buf], { type: mime });
  },

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

  async oracleTts(text: string): Promise<Blob> {
    const res = await fetch(`${BASE}/oracle/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`POST /oracle/tts -> ${res.status}`);
    return res.blob();
  },

  treasurySummary: () => get<TreasurySummary>("/treasury/summary"),
  treasuryEntries: (opts?: { since?: string; god?: string }) => {
    const q = new URLSearchParams();
    if (opts?.since) q.set("since", opts.since);
    if (opts?.god) q.set("god", opts.god);
    const qs = q.toString();
    return get<{ entries: TreasuryEntry[] }>(`/treasury/entries${qs ? `?${qs}` : ""}`);
  },

  missions: () => get<{ missions: Mission[] }>("/missions"),
  createMission: (body: { title: string; description?: string; dueInDays?: number; dueInHours?: number }) =>
    post<{ ok: boolean; mission: Mission }>("/missions", body),
  completeMission: (id: number) => patch<{ ok: boolean; mission: Mission }>(`/missions/${id}`, {}),

  documents: () => get<{ documents: DocumentRecord[] }>("/documents"),
  document: (id: number) => get<{ document: DocumentRecord }>(`/documents/${id}`),
  startResearch: (topic: string, kind?: string) =>
    post<{ ok: boolean; document: DocumentRecord }>("/documents/research", { topic, kind }),

  linearStatus: () => get<{ configured: boolean }>("/linear/status"),
  linearIssues: (team?: string) =>
    get<{ issues: LinearIssue[] }>(`/linear/issues${team ? `?team=${team}` : ""}`),
  linearCreateIssue: (body: { title: string; description?: string; priority?: number; dueDate?: string }) =>
    post<{ ok: boolean; issue: LinearIssue }>("/linear/issues", body),
  linearCompleteIssue: (id: string) => post<{ ok: boolean; issue: LinearIssue }>(`/linear/issues/${id}/complete`, {}),

  tycheStatus: () => get<TycheStatus>("/tyche/status"),
  tycheTrades: () => get<{ trades: TycheTradeBundle[] }>("/tyche/trades"),
  tychePause: (paused: boolean) => post<{ ok: boolean }>("/tyche/pause", { paused }),
  tycheStrategy: (strategy: string) => post<{ ok: boolean }>("/tyche/strategy", { strategy }),
  tycheMode: (mode: string, confirm?: string) =>
    post<{ ok: boolean }>("/tyche/mode", { mode, confirm }),
  tycheScan: () => post<{ ok: boolean }>("/tyche/scan", {}),
  tychePreflight: () => get<TychePreflight>("/tyche/preflight"),
  tycheSession: () => get<TycheSessionStatus & { watchdog?: Record<string, unknown> }>("/tyche/session"),
  tycheSessionStart: () => post<{ ok: boolean; sessionId?: number; error?: string }>("/tyche/session/start", {}),
  tycheSessionStop: (reason?: string) =>
    post<{ ok: boolean }>("/tyche/session/stop", { reason: reason ?? "manual_stop" }),
  tycheEvents: () =>
    get<{ events: TycheSystemEvent[]; riskDecisions: unknown[] }>("/tyche/events?limit=200"),

  tycheStream(handlers: {
    onTrade: (trade: TycheTradeBundle) => void;
    onStatus?: (status: TycheStatus) => void;
    onSystem?: (ev: { kind: string; detail: Record<string, unknown>; at: string }) => void;
  }): { close: () => void } {
    const es = new EventSource(`${BASE}/tyche/stream`);
    es.addEventListener("trade", (ev) => {
      try {
        handlers.onTrade(JSON.parse((ev as MessageEvent).data) as TycheTradeBundle);
      } catch {
        /* ignore malformed */
      }
    });
    es.addEventListener("status", (ev) => {
      if (!handlers.onStatus) return;
      try {
        handlers.onStatus(JSON.parse((ev as MessageEvent).data) as TycheStatus);
      } catch {
        /* ignore malformed */
      }
    });
    es.addEventListener("system", (ev) => {
      if (!handlers.onSystem) return;
      try {
        handlers.onSystem(JSON.parse((ev as MessageEvent).data) as { kind: string; detail: Record<string, unknown>; at: string });
      } catch {
        /* ignore malformed */
      }
    });
    return { close: () => es.close() };
  },

  /** Route a chat message to the right agent. Returns null if the opp has no backend agent. */
  async replyFor(oppId: string, text: string, sessionId?: number): Promise<string | null> {
    if (oppId === "zeus") {
      if (sessionId === undefined) return null;
      return (await this.zeusMessage(sessionId, text)).reply;
    }
    if (oppId === "oracle") return (await this.oracleAnalyze(text)).report;
    if (oppId === "apollo") return (await this.produce()).result;
    return null;
  },
};
