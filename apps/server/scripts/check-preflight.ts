import { kalshiIsConfigured, prophetxIsConfigured, prophetxIsEnabled } from "../src/config.ts";
import { runPreflight } from "../src/tyche/preflight.ts";

async function main() {
  console.log("kalshi configured:", kalshiIsConfigured());
  console.log("prophetx configured:", prophetxIsConfigured(), "enabled:", prophetxIsEnabled());
  const p = await runPreflight();
  console.log("ready:", p.ready);
  console.log("reasons:", p.reasons);
  console.log("kalshi:", p.kalshi.message, "markets:", p.kalshiMarkets, "diag:", p.diagnostics.kalshi);
  console.log("prophetx:", p.prophetx.message, "markets:", p.prophetxMarkets, "diag:", p.diagnostics.prophetx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
