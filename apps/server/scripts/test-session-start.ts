import { runPreflight } from "../src/tyche/preflight.ts";
import { startSandboxSession, stopSandboxSession } from "../src/tyche/session/sessionManager.ts";
import { initTycheSchema } from "../src/tyche/storage/schema.ts";

async function main() {
  initTycheSchema();
  const p = await runPreflight();
  console.log("preflight ready:", p.ready, "kalshi:", p.kalshiMarkets, "px:", p.prophetxMarkets);
  if (!p.ready) {
    console.error("reasons:", p.reasons);
    process.exit(1);
  }
  const r = await startSandboxSession();
  console.log("session start:", r);
  if (!r.ok) process.exit(1);
  await stopSandboxSession("test_cleanup");
  console.log("session stopped OK");
}

main();
