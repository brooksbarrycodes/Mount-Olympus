import { config, llmIsLive, ttsIsLive, kalshiIsConfigured, prophetxIsConfigured } from "./config.ts";
import { seedIfEmpty } from "./core/db.ts";
import { buildServer } from "./server.ts";
import { startScheduler } from "./scheduler.ts";
import { startTycheLoop } from "./tyche/routes.ts";
import { initTreasury } from "./treasury/routes.ts";

async function main() {
  seedIfEmpty();
  initTreasury();

  const app = buildServer();
  startScheduler();
  startTycheLoop();

  await app.listen({ port: config.port, host: "0.0.0.0" });

  const live = llmIsLive();
  const mode = live ? "REAL (Anthropic)" : "MOCK (offline, free)";
  const keyHint = config.anthropicApiKey
    ? `${config.anthropicApiKey.slice(0, 8)}…`
    : "MISSING";

  console.log(`\n  Olympus Agent Server`);
  console.log(`  -> http://localhost:${config.port}`);
  console.log(`  -> brains: ${mode}`);
  console.log(`  -> adapters: ${config.adapterMode}`);
  console.log(`  -> llmLive: ${live}`);
  console.log(`  -> anthropic key: ${keyHint}`);
  console.log(`  -> tts: ${ttsIsLive() ? "LIVE (ElevenLabs)" : "off"}`);
  console.log(`  -> tyche: mode=${config.tyche.mode}, strategy=${config.tyche.strategy}`);
  console.log(`  -> tyche kalshi: ${kalshiIsConfigured() ? "configured" : "mock/offline"} (${config.kalshi.env})`);
  console.log(
    `  -> tyche prophetx: ${prophetxIsConfigured() ? "configured" : "awaiting_credentials"} (${config.prophetx.env})`,
  );
  console.log(`  -> tyche auto-exec: ${config.tyche.autoExecution ? "on" : "off"}`);

  if (config.anthropicApiKey && config.adapterMode === "mock") {
    console.warn(
      "  !! WARNING: ANTHROPIC_API_KEY is set but ADAPTER_MODE=mock — set ADAPTER_MODE=real for live brains.",
    );
  }
  if (config.adapterMode === "real" && !config.anthropicApiKey) {
    console.warn(
      "  !! WARNING: ADAPTER_MODE=real but ANTHROPIC_API_KEY is missing — falling back to mock brains.",
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error("Failed to start Olympus server:", err);
  process.exit(1);
});
