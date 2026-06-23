import type { Agent, Tool } from "../core/agentRuntime.ts";
import { runAgent } from "../core/agentRuntime.ts";
import { googleTrends, pinterestTrends } from "../tools/trends.ts";
import { webSearch } from "../tools/web.ts";
import {
  recordPrediction,
  predictionScore,
  listPredictions,
  resolvePrediction,
} from "../core/predictions.ts";
import { remember, latest } from "../core/memory.ts";
import { listBusinesses, getBusiness, setNiche } from "../core/ledger.ts";
import * as audit from "../core/auditLog.ts";

/** The store the Oracle steers by default (Apollo's print-on-demand shop). */
const STORE_ID = "stickers";

/**
 * The Oracle - research and foresight. She never touches money or publishes;
 * she produces intelligence (rising/cooling trends, niche recommendations) that
 * Zeus and the workers act on. She runs on a cadence (daily report) and
 * on-call (analyze a question), not continuously.
 */

const tools: Tool[] = [
  {
    spec: {
      name: "pinterest_trends",
      description: "Read rising/cooling visual trends from Pinterest for a category.",
      parameters: {
        type: "object",
        properties: { category: { type: "string" } },
        required: ["category"],
      },
    },
    run: (args) => pinterestTrends(String(args.category ?? "wall art")),
  },
  {
    spec: {
      name: "google_trends",
      description: "Read rising/cooling search interest from Google Trends for a category.",
      parameters: {
        type: "object",
        properties: { category: { type: "string" } },
        required: ["category"],
      },
    },
    run: (args) => googleTrends(String(args.category ?? "wall art")),
  },
  {
    spec: {
      name: "web_search",
      description: "Search the web for market/competitor research.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    run: (args) => webSearch(String(args.query ?? "etsy wall art trends")),
  },
  {
    spec: {
      name: "record_prediction",
      description: "Log a prediction so its accuracy can be scored against real sales later.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          prediction: { type: "string" },
          confidence: { type: "number", description: "0..1" },
        },
        required: ["topic", "prediction"],
      },
    },
    run: (args) => {
      const id = recordPrediction({
        agent: "oracle",
        topic: String(args.topic ?? "niche"),
        prediction: String(args.prediction ?? ""),
        confidence: typeof args.confidence === "number" ? args.confidence : 0.5,
      });
      return { ok: true, predictionId: id };
    },
  },
  {
    spec: {
      name: "recommend_niche",
      description:
        "Commit to a recommended niche: sets it on the store so Apollo can act, and logs a prediction so your accuracy is scored against real sales later.",
      parameters: {
        type: "object",
        properties: {
          niche: { type: "string", description: "The specific niche to pursue" },
          rationale: { type: "string", description: "Why this niche, briefly" },
          confidence: { type: "number", description: "0..1" },
          businessId: { type: "string", description: "Defaults to the print-on-demand store" },
        },
        required: ["niche"],
      },
    },
    run: (args) => {
      const businessId = String(args.businessId ?? STORE_ID);
      const niche = String(args.niche ?? "minimalist line-art portraits");
      setNiche(businessId, niche);
      const predictionId = recordPrediction({
        agent: "oracle",
        topic: niche,
        prediction: String(args.rationale ?? `${niche} will see rising, print-friendly demand`),
        confidence: typeof args.confidence === "number" ? args.confidence : 0.6,
        businessId,
      });
      remember("oracle", "niche", `Set ${businessId} niche -> ${niche}`);
      audit.record({
        agent: "oracle",
        action: "set_niche",
        detail: { businessId, niche },
        status: "executed",
      });
      return { ok: true, businessId, niche, predictionId };
    },
  },
  {
    spec: {
      name: "my_score",
      description: "Get the Oracle's prediction track record (total, resolved, average score).",
      parameters: { type: "object", properties: {} },
    },
    run: () => predictionScore("oracle"),
  },
];

/**
 * Grade older, still-unresolved predictions against the ledger. The newest
 * prediction is left pending (it is "this cycle's" bet); earlier ones are scored
 * by whether the niche they backed has produced any real orders/revenue. This is
 * what makes the Oracle's accuracy honest and measurable over time.
 */
function gradeDuePredictions(): number {
  const open = listPredictions("oracle", 50).filter((p) => p.resolved === 0);
  // listPredictions is newest-first; keep the freshest bet pending.
  const toGrade = open.slice(1);
  let graded = 0;
  for (const p of toGrade) {
    const biz = p.business_id ? getBusiness(p.business_id) : undefined;
    const materialized = (biz?.orders ?? 0) > 0 || (biz?.revenue ?? 0) > 0;
    const score = materialized
      ? Math.min(1, Math.round((0.5 + p.confidence / 2) * 100) / 100)
      : Math.max(0, Math.round(p.confidence * 0.3 * 100) / 100);
    resolvePrediction(
      p.id,
      materialized ? "Sales materialized for this niche." : "No measurable demand yet.",
      score,
    );
    graded++;
  }
  return graded;
}

export const oracle: Agent = {
  name: "oracle",
  tier: "balanced",
  tools,
  systemPrompt() {
    const niches = listBusinesses()
      .filter((b) => b.niche)
      .map((b) => `${b.name}: ${b.niche}`)
      .join("; ");
    return [
      "You are the Oracle of Delphi - the empire's seer and analyst. You read trends, predict",
      "rising opportunities, and judge whether a niche is worth pursuing or abandoning. You are",
      "powerful and broad, but honest: you make informed bets, not guarantees, and you log your",
      "predictions so your accuracy can be measured.",
      "",
      niches ? `Current niches in play: ${niches}.` : "No niche is committed yet.",
      "",
      "When asked to research or pick a niche: scan Pinterest and Google trends, optionally",
      "search the web, then recommend ONE specific, low-competition, print-friendly niche with a",
      "short rationale. Record a prediction for any niche you recommend. Be concise and concrete.",
    ].join("\n");
  },
};

export async function analyzeNiche(question: string) {
  const result = await runAgent(oracle, question);
  remember("oracle", "analysis", `Q: ${question}\nA: ${result.text}`);
  return result;
}

const DAILY_PROMPT =
  "Produce today's trend report for our print-on-demand art store. Scan rising and cooling " +
  "signals, then recommend the single niche to pursue (or pivot to) and why. Log a prediction.";

export async function runDailyReport() {
  // Grade last cycle's bets before forming new ones, so the scoreboard fills in.
  gradeDuePredictions();
  const result = await runAgent(oracle, DAILY_PROMPT);
  remember("oracle", "daily_report", result.text);
  return result;
}

export function latestDailyReport() {
  return latest("oracle", "daily_report");
}
