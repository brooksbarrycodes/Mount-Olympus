/**
 * Smoke test for Tyche arb endpoints. Run while the agent server is up:
 *   npm run smoke:tyche --workspace apps/server
 */

const BASE = (process.env.AGENT_API ?? "http://localhost:8787").replace(/\/$/, "");

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`OK: ${msg}`);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) fail(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) fail(`POST ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

interface TycheHealth {
  ok: boolean;
  mode: string;
  lastScanAt: string | null;
}

interface TycheStatus {
  mode: string;
  strategy: string;
  venueHealth: {
    kalshi: { connected: boolean; message: string };
    prophetx: { status: string; message: string };
  } | null;
  opportunities: unknown[];
}

async function main(): Promise<void> {
  console.log(`Smoke-testing Tyche at ${BASE}\n`);

  const health = await get<TycheHealth>("/tyche/health");
  if (!health.ok) fail("/tyche/health returned ok:false");
  ok(`/tyche/health mode=${health.mode}, lastScan=${health.lastScanAt ?? "pending"}`);

  await post("/tyche/scan", {});
  ok("manual scan triggered");

  const status = await get<TycheStatus>("/tyche/status");
  if (!status.venueHealth?.kalshi) fail("missing Kalshi health");
  ok(`Kalshi: ${status.venueHealth.kalshi.message}`);
  ok(`ProphetX: ${status.venueHealth.prophetx?.message ?? "unknown"}`);

  const { trades } = await get<{ trades: Array<{ status: string }> }>("/tyche/trades");
  ok(`trades endpoint returned ${trades.length} bundles`);

  if (process.env.PROPHETX_ACCESS_KEY && process.env.PROPHETX_SECRET_KEY) {
    ok("ProphetX keys present — login smoke delegated to live adapter");
  } else {
    console.log("SKIP: ProphetX keys not set (expected until Anthony enables API)");
  }

  console.log("\nAll Tyche smoke checks passed.");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
