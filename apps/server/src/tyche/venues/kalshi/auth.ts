import { createPrivateKey, sign, constants, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";
import { config, kalshiBaseUrl } from "../../../config.ts";

let cachedKey: KeyObject | null = null;

function loadPrivateKey(): KeyObject {
  if (cachedKey) return cachedKey;
  if (config.kalshi.privateKeyPath) {
    cachedKey = createPrivateKey(readFileSync(config.kalshi.privateKeyPath, "utf8"));
    return cachedKey;
  }
  if (config.kalshi.privateKeyPem) {
    cachedKey = createPrivateKey(config.kalshi.privateKeyPem.replace(/\\n/g, "\n"));
    return cachedKey;
  }
  throw new Error("Set KALSHI_PRIVATE_KEY_PATH or KALSHI_PRIVATE_KEY in apps/server/.env");
}

function signPathForRequest(endpoint: string): string {
  const url = new URL(kalshiApiPath(endpoint));
  return url.pathname;
}

/** Kalshi RSA-PSS auth — see https://docs.kalshi.com/getting_started/api_keys */
export function kalshiAuthHeaders(method: string, endpoint: string): Record<string, string> {
  const ts = Date.now().toString();
  const signPath = signPathForRequest(endpoint);
  const msg = `${ts}${method.toUpperCase()}${signPath}`;
  const sig = sign("sha256", Buffer.from(msg), {
    key: loadPrivateKey(),
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  }).toString("base64");

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
