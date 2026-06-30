import type { Agent, Tool } from "../core/agentRuntime.ts";
import { runAgent } from "../core/agentRuntime.ts";
import { listBusinesses, totals } from "../core/ledger.ts";
import { listPending } from "../core/approvals.ts";
import { guardrailState } from "../core/guardrails.ts";
import { remember } from "../core/memory.ts";
import * as audit from "../core/auditLog.ts";
import { analyzeNiche, runDailyReport } from "./oracle.ts";
import { produceListings } from "./apollo.ts";
import {
  appendMessage,
  DEFAULT_SESSION_TITLE,
  getRecentContext,
  getSession,
  heuristicTitle,
  setSessionTitle,
} from "../core/chatSessions.ts";
import { llmIsLive } from "../config.ts";
import { getLlm } from "../core/llm/index.ts";
import { getTycheStatus, runScan } from "../tyche/tycheLoop.ts";
import { setTychePaused } from "../tyche/risk/killSwitch.ts";
import { listTrades, todayPnlUsd } from "../tyche/storage/repositories.ts";
import { getSessionStatus } from "../tyche/session/sessionManager.ts";
import { getWatchdogState, emergencyStopTyche } from "../tyche/watchdog/zeusWatchdog.ts";
import { setKill } from "../core/guardrails.ts";
import { treasurySummary, recordCost, listEntries } from "../treasury/ledger.ts";
import {
  createMission,
  listMissions,
  completeMission,
  parseDueFromHours,
  parseDueFromDays,
} from "../missions/store.ts";
import { startResearch, listDocuments, getDocument } from "../documents/store.ts";
import {
  listIssues,
  createIssue,
  completeIssue,
  addComment,
} from "../tools/linear.ts";

/**
 * Zeus - the overseer. He governs the other gods: reads the ledger, watches the
 * approval queue and guardrails, makes broad plans, and delegates. He does NOT
 * execute worker tasks himself. "He is you when you're not there."
 */

const MAX_CONTEXT_TURNS = 40;
const ZEUS_AGENT = "zeus";

const noArgs = { type: "object", properties: {} } as const;

const tools: Tool[] = [
  {
    spec: {
      name: "ledger_summary",
      description: "Get company-wide profit/revenue/margin and a per-business breakdown.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: () => ({
      totals: totals(),
      businesses: listBusinesses().map((b) => ({
        id: b.id,
        name: b.name,
        god: b.god,
        niche: b.niche,
        revenue: b.revenue,
        profit: b.profit,
        margin: b.margin,
        budgetRemaining: b.budgetRemaining,
      })),
    }),
  },
  {
    spec: {
      name: "list_approvals",
      description: "List actions workers have proposed that await your approval.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: () => listPending(),
  },
  {
    spec: {
      name: "guardrails",
      description: "Read the current safety rails: kill switch, margin floor, budget cap, spend today.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: () => guardrailState(),
  },
  {
    spec: {
      name: "tyche_status",
      description: "Tyche arb desk: mode, balances, open trades, today P&L.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: () => {
      const s = getTycheStatus();
      return {
        mode: s.mode,
        strategy: s.strategy,
        paused: s.paused,
        balances: s.balances,
        venueHealth: s.venueHealth,
        todayPnlUsd: todayPnlUsd(),
        recentTrades: listTrades(5).map((t) => ({
          id: t.id,
          status: t.status,
          event: t.eventName,
          lockedProfitUsd: t.lockedProfitUsd,
          actualPnlUsd: t.actualPnlUsd,
        })),
        lastScanAt: s.lastScanAt,
      };
    },
  },
  {
    spec: {
      name: "tyche_session_status",
      description: "Tyche sandbox session: countdown, order caps, watchdog state, venue health.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: () => {
      const s = getTycheStatus();
      return {
        session: getSessionStatus(),
        watchdog: getWatchdogState(),
        mode: s.mode,
        paused: s.paused,
        venueHealth: s.venueHealth,
        todayPnlUsd: todayPnlUsd(),
      };
    },
  },
  {
    spec: {
      name: "treasury_summary",
      description: "Project treasury: balance, costs, credits, week/month/all-time net.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: () => ({ ...treasurySummary(), recent: listEntries({ limit: 10 }) }),
  },
  {
    spec: {
      name: "record_cost",
      description: "Log a project cost Brooks mentions (subscription, tool, fee). Use archon for personal/non-god spend.",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string" },
          amount: { type: "number" },
          category: { type: "string", description: "api, subscription, infra, trading, other" },
          godId: { type: "string", description: "zeus, oracle, apollo, tyche, archon" },
        },
        required: ["label", "amount"],
      },
    },
    run: (args) => {
      const id = recordCost({
        label: String(args.label),
        amountUsd: Number(args.amount),
        category: (args.category as "api") ?? "other",
        attributedGodId: String(args.godId ?? "archon"),
        source: "zeus",
      });
      return { ok: true, id, summary: treasurySummary() };
    },
  },
  {
    spec: {
      name: "list_costs",
      description: "List recent treasury cost/credit entries.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" }, god: { type: "string" } },
      },
    },
    run: (args) => listEntries({ limit: Number(args.limit ?? 20), god: args.god as string | undefined }),
  },
  {
    spec: {
      name: "add_mission",
      description:
        "Add a reminder/mission for Brooks. REQUIRED for any reminder, todo, or deadline request — always call this tool, never only acknowledge in chat.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          dueInHours: { type: "number", description: "Deadline in hours from now" },
          dueInDays: { type: "number", description: "Deadline in days from now" },
          dueAt: { type: "string", description: "ISO datetime deadline if user names a specific date/time" },
        },
        required: ["title"],
      },
    },
    run: (args) => {
      let dueAt: string | null = null;
      if (args.dueAt != null && String(args.dueAt).trim()) {
        dueAt = String(args.dueAt);
      } else if (args.dueInHours != null) dueAt = parseDueFromHours(Number(args.dueInHours));
      else if (args.dueInDays != null) dueAt = parseDueFromDays(Number(args.dueInDays));
      const mission = createMission({
        title: String(args.title),
        description: args.description ? String(args.description) : undefined,
        dueAt,
        createdBy: "zeus",
      });
      return { ok: true, mission };
    },
  },
  {
    spec: {
      name: "list_missions",
      description: "List active missions with deadlines.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: () => listMissions(false),
  },
  {
    spec: {
      name: "complete_mission",
      description: "Mark a mission complete by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
    run: (args) => ({ ok: true, mission: completeMission(Number(args.id)) }),
  },
  {
    spec: {
      name: "start_research",
      description: "Start a long research document in the Scriptorium (not chat). Use for research, lists, plans.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          kind: { type: "string", enum: ["research", "plan", "list", "memo"] },
        },
        required: ["topic"],
      },
    },
    run: async (args) => {
      const doc = await startResearch(String(args.topic), (args.kind as "research") ?? "research");
      return { ok: true, documentId: doc.id, title: doc.title, status: doc.status };
    },
  },
  {
    spec: {
      name: "list_documents",
      description: "List Scriptorium documents newest first.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: () => listDocuments(20),
  },
  {
    spec: {
      name: "get_document",
      description: "Get full document content by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
    run: (args) => getDocument(Number(args.id)),
  },
  {
    spec: {
      name: "linear_list_issues",
      description: "List Linear issues from the project board.",
      parameters: noArgs as unknown as Record<string, unknown>,
    },
    run: async () => listIssues(),
  },
  {
    spec: {
      name: "linear_create_issue",
      description: "Create a Linear issue for project work.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "number" },
          dueDate: { type: "string" },
        },
        required: ["title"],
      },
    },
    run: async (args) =>
      createIssue({
        title: String(args.title),
        description: args.description ? String(args.description) : undefined,
        priority: args.priority != null ? Number(args.priority) : undefined,
        dueDate: args.dueDate ? String(args.dueDate) : undefined,
      }),
  },
  {
    spec: {
      name: "linear_complete_issue",
      description: "Mark a Linear issue done.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    run: async (args) => completeIssue(String(args.id)),
  },
  {
    spec: {
      name: "linear_add_comment",
      description: "Add a comment to a Linear issue.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" }, body: { type: "string" } },
        required: ["id", "body"],
      },
    },
    run: async (args) => addComment(String(args.id), String(args.body)),
  },
  {
    spec: {
      name: "linear_create_plan",
      description: "Create a parent Linear issue plus sub-issues from a structured plan.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
        },
        required: ["title", "steps"],
      },
    },
    run: async (args) => {
      const parent = await createIssue({ title: String(args.title), description: "Plan created by Zeus" });
      const steps = (args.steps as string[]) ?? [];
      const children = [];
      for (const step of steps) {
        children.push(await createIssue({ title: step, description: `Part of: ${args.title}` }));
      }
      return { ok: true, parent, children };
    },
  },
  {
    spec: {
      name: "delegate",
      description: "Assign a task to a worker god (e.g. 'oracle' or 'apollo'). Records the decree.",
      parameters: {
        type: "object",
        properties: {
          agent: { type: "string", description: "Worker to assign, e.g. oracle or apollo" },
          task: { type: "string", description: "What they should do" },
        },
        required: ["agent", "task"],
      },
    },
    run: async (args) => {
      const target = String(args.agent ?? "").toLowerCase();
      const task = String(args.task ?? "");
      remember("zeus", "delegation", `${target}: ${task}`);
      audit.record({ agent: "zeus", action: "delegate", detail: { target, task }, status: "executed" });
      try {
        if (target.includes("oracle")) {
          const r = task.trim() ? await analyzeNiche(task) : await runDailyReport();
          return { ok: true, target: "oracle", delegated: true, result: r.text };
        }
        if (target.includes("apollo")) {
          const r = await produceListings(task.trim() || undefined);
          return { ok: true, target: "apollo", delegated: true, result: r.text };
        }
        if (target.includes("tyche")) {
          const lower = task.toLowerCase();
          if (lower.includes("kill") || lower.includes("emergency")) {
            setKill(true);
            await emergencyStopTyche("zeus_delegate_kill");
            return { ok: true, target: "tyche", action: "killed" };
          }
          if (lower.includes("stop session") || lower.includes("stop sandbox")) {
            await emergencyStopTyche("zeus_delegate_stop");
            return { ok: true, target: "tyche", action: "session_stopped" };
          }
          if (lower.includes("pause")) {
            setTychePaused(true);
            return { ok: true, target: "tyche", action: "paused" };
          }
          if (lower.includes("resume") || lower.includes("unpause")) {
            setTychePaused(false);
            await runScan();
            return { ok: true, target: "tyche", action: "resumed" };
          }
          if (lower.includes("scan")) {
            await runScan();
            return { ok: true, target: "tyche", action: "scan", status: getTycheStatus() };
          }
          return { ok: true, target: "tyche", status: getTycheStatus() };
        }
        return {
          ok: true,
          target,
          delegated: false,
          note: "No such worker yet; decree recorded for when they join the Pantheon.",
        };
      } catch (err) {
        return { ok: false, target, error: String(err) };
      }
    },
  },
];

export const zeus: Agent = {
  name: ZEUS_AGENT,
  tier: "balanced",
  tools,
  systemPrompt() {
    const t = totals();
    const g = guardrailState();
    const ts = treasurySummary();
    return [
      "You are Zeus — the user's right-hand executive overseeing an AI-run business portfolio.",
      "The user's name is Brooks. Address him by name when natural.",
      "You communicate like a sharp, trusted COO: direct, plain English, numbers-first.",
      "",
      "Operator powers — USE TOOLS, do not just acknowledge:",
      "- Brooks mentions a cost/subscription → record_cost (archon for personal tools like Cursor/Figma).",
      "- ANY reminder, todo, task, or deadline for Brooks → add_mission (with dueInDays/dueInHours/dueAt when mentioned).",
      "  Examples: 'remind me in 3 days', 'I need X by Friday', 'don't let me forget Y'.",
      "  NEVER say you added a reminder unless add_mission succeeded. Reminders appear on the Mission HUD.",
      "- Big research, company lists, strategic plans → start_research (Scriptorium), NOT long chat replies.",
      "- Multi-step engineering / project work → linear_create_issue or linear_create_plan.",
      "- Tyche sandbox session running → tyche_session_status; emergency stop → delegate tyche kill.",
      "- Personal countdown reminders → add_mission. Team/project backlog → Linear.",
      "",
      "Live state:",
      `- Project treasury balance: $${ts.balance.toFixed(2)} (week ${ts.weekNet.toFixed(2)}, month ${ts.monthNet.toFixed(2)}).`,
      `- Business ledger: revenue $${Math.round(t.revenue).toLocaleString()}, profit $${Math.round(t.profit).toLocaleString()}.`,
      `- Guardrails: kill switch ${g.killSwitch ? "ON" : "off"}, daily cap $${g.dailyBudgetCapUsd}.`,
      "",
      "When asked for strategy, give a concrete next move and use tools to execute when appropriate.",
    ].join("\n");
  },
};

function maybeTitleSession(sessionId: number, userMessage: string): void {
  const session = getSession(sessionId);
  if (!session || session.title !== DEFAULT_SESSION_TITLE) return;

  const title = heuristicTitle(userMessage);
  setSessionTitle(sessionId, title);

  if (!llmIsLive()) return;

  void (async () => {
    try {
      const llm = getLlm();
      const res = await llm.complete({
        system:
          "Reply with ONLY a 4-6 word title for a business chat. No quotes, no punctuation at the end.",
        messages: [{ role: "user", content: userMessage.slice(0, 500) }],
        tier: "fast",
        meta: { agent: ZEUS_AGENT },
      });
      const upgraded = res.text.replace(/^["']|["']$/g, "").trim().slice(0, 60);
      if (upgraded) setSessionTitle(sessionId, upgraded);
    } catch {
      /* keep heuristic title */
    }
  })();
}

export async function askZeus(sessionId: number, message: string) {
  const priorMessages = getRecentContext(sessionId, MAX_CONTEXT_TURNS);
  const isFirstExchange = priorMessages.length === 0;
  const result = await runAgent(zeus, message, { priorMessages });
  appendMessage(sessionId, "user", message);
  appendMessage(sessionId, "assistant", result.text);
  if (isFirstExchange) maybeTitleSession(sessionId, message);
  return result;
}

const OPENING_PROMPT =
  "Generate exactly ONE short spoken greeting sentence for Brooks as he opens a chat with you. " +
  "You are Zeus, his COO/right-hand — professional, lightly thematic (overseer of the portfolio), " +
  "not purple prose. Greet Brooks by name and ask what he needs today. Vary the wording every time. " +
  "Plain text only — no markdown, no quotes, one sentence.";

/** Fresh opening line when Brooks opens the Zeus dialog; persisted as the latest assistant message. */
export async function generateZeusOpening(sessionId: number): Promise<string> {
  const llm = getLlm();
  const res = await llm.complete({
    system: zeus.systemPrompt(),
    messages: [{ role: "user", content: OPENING_PROMPT }],
    tier: "fast",
    meta: { agent: ZEUS_AGENT },
  });
  const text = res.text.replace(/^["']|["']$/g, "").trim();
  if (!text) throw new Error("Opening greeting was empty");
  appendMessage(sessionId, "assistant", text);
  return text;
}
