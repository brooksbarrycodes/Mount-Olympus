import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { db } from "../core/db.ts";
import { initTreasurySchema } from "./schema.ts";
import { recordCost, recordCredit, treasurySummary, listEntries } from "./ledger.ts";
import { addRecurring, accrueRecurring } from "./recurring.ts";
import { parseDueFromDays, parseDueFromHours } from "../missions/store.ts";

const TEST_REF = "test-treasury-run";

before(() => {
  initTreasurySchema();
  db.prepare(`DELETE FROM treasury_entries WHERE reference LIKE ?`).run(`${TEST_REF}%`);
  db.prepare(`DELETE FROM treasury_recurring WHERE label LIKE ?`).run(`${TEST_REF}%`);
});

after(() => {
  db.prepare(`DELETE FROM treasury_entries WHERE reference LIKE ?`).run(`${TEST_REF}%`);
  db.prepare(`DELETE FROM treasury_recurring WHERE label LIKE ?`).run(`${TEST_REF}%`);
});

describe("treasury ledger", () => {
  it("records costs and credits with correct balance", () => {
    recordCost({
      label: "Test API call",
      amountUsd: 2.5,
      category: "api",
      source: "auto",
      reference: `${TEST_REF}:cost`,
    });
    recordCredit({
      label: "Test revenue",
      amountUsd: 10,
      category: "other",
      source: "manual",
      reference: `${TEST_REF}:credit`,
    });
    const s = treasurySummary();
    assert.ok(s.totalCosts >= 2.5);
    assert.ok(s.totalCredits >= 10);
    const entries = listEntries({ limit: 5 });
    assert.ok(entries.some((e) => e.reference === `${TEST_REF}:cost`));
  });

  it("accrues recurring subscriptions", () => {
    addRecurring({
      label: `${TEST_REF} Cursor`,
      amountUsd: 20,
      category: "subscription",
    });
    db.prepare(
      `UPDATE treasury_recurring SET next_accrue_at = ? WHERE label LIKE ?`,
    ).run(new Date(0).toISOString(), `${TEST_REF}%`);
    const n = accrueRecurring();
    assert.ok(n >= 1);
    const entries = listEntries({ limit: 20 });
    assert.ok(entries.some((e) => e.source === "recurring" && e.label.includes(TEST_REF)));
  });

  it("computes week and month net from recent entries", () => {
    const s = treasurySummary();
    assert.equal(typeof s.weekNet, "number");
    assert.equal(typeof s.monthNet, "number");
    assert.equal(typeof s.negative, "boolean");
  });
});

describe("missions due parsing", () => {
  it("parses due dates from hours and days", () => {
    const in24h = parseDueFromHours(24);
    const in7d = parseDueFromDays(7);
    assert.ok(new Date(in24h).getTime() > Date.now());
    assert.ok(new Date(in7d).getTime() > Date.now() + 6 * 86400000);
  });
});
