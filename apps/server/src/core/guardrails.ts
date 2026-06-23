import { kvGet, kvSet } from "./db.ts";
import { guardrailDefaults } from "../config.ts";
import { spendSince } from "./ledger.ts";
import { listSince } from "./auditLog.ts";

/**
 * Deterministic safety rails. These are CODE, never AI judgment: an agent (or a
 * bug, or even an "approved" action) cannot get past them. This is the
 * "stop them before they waste my money" layer.
 */

const KILL_KEY = "kill_switch";

export function isKilled(): boolean {
  return kvGet(KILL_KEY) === "on";
}

export function setKill(on: boolean): void {
  kvSet(KILL_KEY, on ? "on" : "off");
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface GuardCheck {
  ok: boolean;
  violations: string[];
}

export interface PublishPayload {
  /** Sale price in USD. */
  price?: number;
  /** All-in cost (product + fees) in USD. */
  cost?: number;
  /** New spend this action would incur in USD. */
  spend?: number;
}

/**
 * Validate a publish-style action against the rails. Called before ANY real
 * action executes, even one you approved.
 */
export function checkPublish(payload: PublishPayload): GuardCheck {
  const violations: string[] = [];

  if (isKilled()) {
    violations.push("Kill switch is ON - all agent actions are halted.");
    return { ok: false, violations };
  }

  // Margin floor
  const price = payload.price ?? 0;
  const cost = payload.cost ?? 0;
  if (price > 0) {
    const margin = (price - cost) / price;
    if (margin < guardrailDefaults.marginFloor) {
      violations.push(
        `Margin ${(margin * 100).toFixed(0)}% is below the ${(guardrailDefaults.marginFloor * 100).toFixed(0)}% floor.`,
      );
    }
  }

  // Daily spend cap
  const todaySpend = spendSince(startOfTodayIso()) + (payload.spend ?? 0);
  if (todaySpend > guardrailDefaults.dailyBudgetCapUsd) {
    violations.push(
      `Daily spend $${todaySpend.toFixed(2)} would exceed the $${guardrailDefaults.dailyBudgetCapUsd} cap.`,
    );
  }

  // Publish rate limit
  const publishesToday = listSince(startOfTodayIso()).filter(
    (e) => e.action === "publish" && (e.status === "approved" || e.status === "executed"),
  ).length;
  if (publishesToday >= guardrailDefaults.publishRateLimitPerDay) {
    violations.push(
      `Publish rate limit reached (${guardrailDefaults.publishRateLimitPerDay}/day).`,
    );
  }

  return { ok: violations.length === 0, violations };
}

export interface GuardrailState {
  killSwitch: boolean;
  marginFloor: number;
  dailyBudgetCapUsd: number;
  publishRateLimitPerDay: number;
  spendToday: number;
}

export function guardrailState(): GuardrailState {
  return {
    killSwitch: isKilled(),
    marginFloor: guardrailDefaults.marginFloor,
    dailyBudgetCapUsd: guardrailDefaults.dailyBudgetCapUsd,
    publishRateLimitPerDay: guardrailDefaults.publishRateLimitPerDay,
    spendToday: spendSince(startOfTodayIso()),
  };
}
