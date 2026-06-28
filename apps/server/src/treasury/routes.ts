import type { FastifyInstance } from "fastify";
import { db } from "../core/db.ts";
import { treasurySummary, listEntries, recordCost, recordCredit } from "./ledger.ts";
import { addRecurring, listRecurring, accrueRecurring } from "./recurring.ts";
import { initTreasurySchema } from "./schema.ts";
import { seedTreasuryRecurring } from "./seed.ts";
import type { TreasuryCategory } from "./ledger.ts";

export function registerTreasuryRoutes(app: FastifyInstance): void {
  app.get("/treasury/summary", async () => treasurySummary());

  app.get<{ Querystring: { since?: string; god?: string; limit?: string } }>(
    "/treasury/entries",
    async (req) => ({
      entries: listEntries({
        since: req.query.since,
        god: req.query.god,
        limit: Number(req.query.limit ?? 100),
      }),
    }),
  );

  app.post<{
    Body: {
      label?: string;
      amount?: number;
      category?: string;
      godId?: string;
    };
  }>("/treasury/cost", async (req, reply) => {
    const label = String(req.body?.label ?? "").trim();
    const amount = Number(req.body?.amount);
    if (!label || !Number.isFinite(amount) || amount <= 0) {
      return reply.code(400).send({ error: "label and positive amount required" });
    }
    const id = recordCost({
      label,
      amountUsd: amount,
      category: (req.body?.category as TreasuryCategory) ?? "other",
      attributedGodId: req.body?.godId ?? "archon",
      source: "manual",
    });
    return { ok: true, id, summary: treasurySummary() };
  });

  app.post<{
    Body: {
      label?: string;
      amount?: number;
      category?: string;
      godId?: string;
    };
  }>("/treasury/credit", async (req, reply) => {
    const label = String(req.body?.label ?? "").trim();
    const amount = Number(req.body?.amount);
    if (!label || !Number.isFinite(amount) || amount <= 0) {
      return reply.code(400).send({ error: "label and positive amount required" });
    }
    const id = recordCredit({
      label,
      amountUsd: amount,
      category: (req.body?.category as TreasuryCategory) ?? "other",
      attributedGodId: req.body?.godId ?? "archon",
      source: "manual",
    });
    return { ok: true, id, summary: treasurySummary() };
  });

  app.post<{
    Body: { label?: string; amount?: number; category?: string; godId?: string };
  }>("/treasury/recurring", async (req, reply) => {
    const label = String(req.body?.label ?? "").trim();
    const amount = Number(req.body?.amount);
    if (!label || !Number.isFinite(amount) || amount <= 0) {
      return reply.code(400).send({ error: "label and positive amount required" });
    }
    const id = addRecurring({
      label,
      amountUsd: amount,
      category: (req.body?.category as TreasuryCategory) ?? "subscription",
      attributedGodId: req.body?.godId ?? "archon",
    });
    return { ok: true, id, recurring: listRecurring() };
  });
}

export function initTreasury(): void {
  initTreasurySchema();
  db.prepare(`UPDATE businesses SET base_revenue = 0, base_expenses = 0, base_orders = 0`).run();
  seedTreasuryRecurring();
  accrueRecurring();
}
