import { kvGet, kvSet } from "../../core/db.ts";
import { isKilled } from "../../core/guardrails.ts";

const PAUSE_KEY = "tyche_paused";
const LEG_FAILURE_LIMIT = 5;
const DAILY_LOSS_CAP = -10;

export function isTychePaused(): boolean {
  return kvGet(PAUSE_KEY) === "on";
}

export function setTychePaused(on: boolean): void {
  kvSet(PAUSE_KEY, on ? "on" : "off");
}

export function killBlocksTyche(): boolean {
  return isKilled();
}

export { isKilled, setKill } from "../../core/guardrails.ts";

export function shouldAutoPause(legFailuresToday: number, dailyPnl: number): boolean {
  if (legFailuresToday >= LEG_FAILURE_LIMIT) return true;
  if (dailyPnl <= DAILY_LOSS_CAP) return true;
  return false;
}
