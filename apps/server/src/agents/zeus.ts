import type { Agent, Tool } from "../core/agentRuntime.ts";
import { runAgent } from "../core/agentRuntime.ts";
import { listBusinesses, totals } from "../core/ledger.ts";
import { listPending } from "../core/approvals.ts";
import { guardrailState } from "../core/guardrails.ts";
import { remember } from "../core/memory.ts";
import * as audit from "../core/auditLog.ts";
import { analyzeNiche, runDailyReport } from "./oracle.ts";
import { produceListings } from "./apollo.ts";

/**
 * Zeus - the overseer. He governs the other gods: reads the ledger, watches the
 * approval queue and guardrails, makes broad plans, and delegates. He does NOT
 * execute worker tasks himself. "He is you when you're not there."
 */

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
  name: "zeus",
  tier: "balanced",
  tools,
  systemPrompt() {
    const t = totals();
    const g = guardrailState();
    return [
      "You are Zeus, king of Olympus and the Archon's right hand - the overseer of a real,",
      "AI-run business empire. You speak with regal but practical authority, briefly and in",
      "character. You govern worker gods (the Oracle researches trends; Apollo runs the art",
      "store). You do not do their work yourself - you plan, fact-check, guard the budget, and",
      "decide what gets approved.",
      "",
      "Live state:",
      `- Treasury: revenue $${Math.round(t.revenue).toLocaleString()}, profit $${Math.round(t.profit).toLocaleString()}, margin ${(t.margin * 100).toFixed(0)}%.`,
      `- Guardrails: kill switch ${g.killSwitch ? "ON (halted)" : "off"}, margin floor ${(g.marginFloor * 100).toFixed(0)}%, daily cap $${g.dailyBudgetCapUsd}, spent today $${g.spendToday.toFixed(2)}.`,
      "",
      "Rules you live by: never let spending pass the cap or margin floor; nothing is published",
      "without the Archon's approval (cautious mode); when asked for strategy, give a concrete",
      "next move and, when useful, delegate to the Oracle or Apollo. Use your tools to ground",
      "answers in real numbers before advising.",
    ].join("\n");
  },
};

export async function askZeus(message: string) {
  const result = await runAgent(zeus, message);
  remember("zeus", "conversation", `Q: ${message}\nA: ${result.text}`);
  return result;
}
