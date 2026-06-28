import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bundleCost, computeMaxSize } from "./pricing/bundleCalculator.ts";
import { scoreMatch, normalizeEventKey } from "./matching/rules.ts";
import type { NormalizedMarket } from "./models/normalizedMarket.ts";
import { handleLegRisk } from "./execution/legRiskManager.ts";
import { dualBalanceGate } from "./pricing/capitalManager.ts";

describe("bundleCalculator", () => {
  it("computes 49+49=98 bundle with 2c gross edge", () => {
    assert.equal(bundleCost(0.49, 0.49), 0.98);
    assert.ok(Math.abs(1 - bundleCost(0.49, 0.49) - 0.02) < 1e-9);
  });

  it("caps size by dual balance", () => {
    const size = computeMaxSize(500, 500, 50, 30, 0.49, 0.49);
    assert.ok(size <= Math.floor(30 / 0.49));
  });
});

describe("matching", () => {
  const base = (over: Partial<NormalizedMarket>): NormalizedMarket => ({
    venue: "kalshi",
    marketId: "A",
    eventId: "E",
    eventName: "NY Mets vs Phillies",
    sport: "baseball",
    league: "MLB",
    marketType: "binary",
    yesAsk: 0.5,
    yesBid: 0.49,
    noAsk: 0.5,
    noBid: 0.49,
    yesAskDepth: 100,
    noAskDepth: 100,
    startTime: new Date(Date.now() + 3600000).toISOString(),
    isLive: false,
    resolutionText: "Mets win",
    overtimeIncluded: false,
    fetchedAt: new Date().toISOString(),
    ...over,
  });

  it("EXACT_MATCH for same event", () => {
    const k = base({ venue: "kalshi", eventName: "NY Mets to win vs Phillies" });
    const p = base({
      venue: "prophetx",
      marketId: "B",
      eventName: "NY Mets vs Phillies",
    });
    assert.equal(scoreMatch(k, p), "EXACT_MATCH");
  });

  it("blocks overtime mismatch via NOT_MATCH on events", () => {
    const k = base({ overtimeIncluded: true });
    const p = base({ venue: "prophetx", marketId: "B", overtimeIncluded: false });
    assert.equal(scoreMatch(k, p), "NOT_MATCH");
  });

  it("normalizes event keys", () => {
    assert.ok(normalizeEventKey("NY Mets to win vs Phillies").includes("mets"));
  });
});

describe("risk", () => {
  it("dual balance gate requires both venues", () => {
    const ok = dualBalanceGate(
      {
        kalshi: { venue: "kalshi", availableUsd: 50, deployedUsd: 0, totalUsd: 50, fetchedAt: "" },
        prophetx: { venue: "prophetx", availableUsd: 30, deployedUsd: 0, totalUsd: 30, fetchedAt: "" },
        freeUsd: 80,
        deployedUsd: 0,
      },
      30,
    );
    assert.equal(ok, true);
    const bad = dualBalanceGate(
      {
        kalshi: { venue: "kalshi", availableUsd: 50, deployedUsd: 0, totalUsd: 50, fetchedAt: "" },
        prophetx: { venue: "prophetx", availableUsd: 20, deployedUsd: 0, totalUsd: 20, fetchedAt: "" },
        freeUsd: 70,
        deployedUsd: 0,
      },
      30,
    );
    assert.equal(bad, false);
  });
});

describe("legRiskManager", () => {
  it("marks failed on single-leg fill", () => {
    const legs = [
      {
        venue: "kalshi" as const,
        marketId: "A",
        side: "yes" as const,
        price: 0.49,
        quantity: 10,
        orderId: "1",
        status: "filled" as const,
        filledQty: 10,
        feeUsd: 0.05,
      },
      {
        venue: "prophetx" as const,
        marketId: "B",
        side: "no" as const,
        price: 0.49,
        quantity: 10,
        orderId: "2",
        status: "failed" as const,
        filledQty: 0,
        feeUsd: 0,
      },
    ];
    const out = handleLegRisk(legs, 0.2);
    assert.equal(out.success, false);
    assert.match(out.failureReason ?? "", /leg risk/i);
  });
});
