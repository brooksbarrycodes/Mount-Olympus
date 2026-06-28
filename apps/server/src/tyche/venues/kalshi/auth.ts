import { createHmac } from "node:crypto";
import { config, kalshiBaseUrl } from "../../../config.ts";

/** Kalshi API key auth — sign per Kalshi trade-api docs. */
export function kalshiAuthHeaders(method: string, path: string): Record<string, string> {
  const ts = Date.now().toString();
  const msg = `${ts}${method.toUpperCase()}${path}`;
  const sig = createHmac("sha256", config.kalshi.apiSecret).update(msg).digest("hex");
  return {
    "KALSHI-ACCESS-KEY": config.kalshi.apiKey,
    "KALSHI-ACCESS-TIMESTAMP": ts,
    "KALSHI-ACCESS-SIGNATURE": sig,
    "Content-Type": "application/json",
  };
}

export function kalshiApiPath(endpoint: string): string {
  return `${kalshiBaseUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}
