import { config } from "../../config.ts";

export function withinTradeCap(notionalUsd: number): boolean {
  return notionalUsd <= config.tyche.maxTradeUsd;
}

export function withinDailyNotional(current: number, add: number): boolean {
  return current + add <= config.tyche.maxDailyNotionalUsd;
}

export function bookIsFresh(fetchedAt: string, maxAgeMs = config.tyche.maxOrderbookAgeMs): boolean {
  return Date.now() - new Date(fetchedAt).getTime() <= maxAgeMs;
}
