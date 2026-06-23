import { config, llmIsLive } from "./config.ts";
import { seedIfEmpty } from "./core/db.ts";
import { buildServer } from "./server.ts";
import { startScheduler } from "./scheduler.ts";

async function main() {
  seedIfEmpty();

  const app = buildServer();
  startScheduler();

  await app.listen({ port: config.port, host: "0.0.0.0" });

  const mode = llmIsLive() ? "REAL (Anthropic)" : "MOCK (offline, free)";
  console.log(`\n  Olympus Agent Server`);
  console.log(`  -> http://localhost:${config.port}`);
  console.log(`  -> brains: ${mode}`);
  console.log(`  -> adapters: ${config.adapterMode}\n`);
}

main().catch((err) => {
  console.error("Failed to start Olympus server:", err);
  process.exit(1);
});
