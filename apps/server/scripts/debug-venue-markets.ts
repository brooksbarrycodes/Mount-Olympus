import { kalshiIsConfigured, prophetxIsConfigured, prophetxIsEnabled } from "../src/config.ts";
import { fetchKalshiMarkets, getLastKalshiIngestionStats } from "../src/tyche/venues/kalshi/client.ts";
import {
  fetchProphetxMarkets,
  getLastProphetxIngestionStats,
  prophetxEnsureToken,
  pxGet,
} from "../src/tyche/venues/prophetx/client.ts";
import { mapProphetxMoneyline } from "../src/tyche/venues/prophetx/mapper.ts";
import { runPreflight } from "../src/tyche/preflight.ts";
import { setRuntimeMode } from "../src/tyche/runtimeContext.ts";

async function main() {
  console.log("=== Tyche venue market debug ===\n");
  console.log("kalshi configured:", kalshiIsConfigured());
  console.log("prophetx configured:", prophetxIsConfigured(), "enabled:", prophetxIsEnabled());

  setRuntimeMode("sandbox");

  console.log("\n--- Kalshi ---");
  const kalshi = await fetchKalshiMarkets();
  const kStats = getLastKalshiIngestionStats();
  console.log("raw:", kStats.rawCount, "mapped:", kStats.mappedCount, "returned:", kalshi.length);

  console.log("\n--- ProphetX ---");
  const token = await prophetxEnsureToken();
  console.log("token:", token ? "ok" : "missing");
  if (token) {
    const tournaments = await pxGet<{ data?: { tournaments?: Array<{ id?: number; name?: string }> } }>(
      token,
      "/mm/get_tournaments",
    );
    const list = tournaments?.data?.tournaments ?? [];
    console.log("tournaments:", list.length, list.slice(0, 5).map((t) => `${t.id}:${t.name}`).join(", "));

    for (const tid of list.slice(0, 4).map((t) => t.id).filter((id): id is number => id != null)) {
      const eventsResp = await pxGet<{ data?: { sport_events?: Array<Record<string, unknown>> } }>(
        token,
        "/mm/get_sport_events",
        { tournament_id: String(tid) },
      );
      const events = eventsResp?.data?.sport_events ?? [];
      console.log(`  tournament ${tid}: ${events.length} events`);
      if (events.length > 0) {
        const eid = String(events[0]!.event_id);
        const mkts = await pxGet<{ data?: Record<string, unknown[]> }>(token, "/v2/mm/get_multiple_markets", {
          event_ids: eid,
        });
        const raw = mkts?.data?.[eid] ?? [];
        console.log(`    sample event ${eid}: ${raw.length} raw markets`);
        if (raw[0]) {
          const sample = raw[0] as Record<string, unknown>;
          console.log("    sample market type:", sample.type, "status:", sample.status);
          const mapped = mapProphetxMoneyline(
            sample as Parameters<typeof mapProphetxMoneyline>[0],
            events[0] as Parameters<typeof mapProphetxMoneyline>[1],
            "other",
          );
          console.log("    mapped:", mapped ? mapped.marketId : "null");
        }
      }
    }
  }

  const px = await fetchProphetxMarkets(kalshi);
  const pStats = getLastProphetxIngestionStats();
  console.log(
    "\nprophetx ingestion:",
    `tournaments=${pStats.tournamentsQueried}`,
    `events=${pStats.eventsFound}`,
    `raw=${pStats.rawMarkets}`,
    `mapped=${pStats.mappedMarkets}`,
    `returned=${px.length}`,
  );

  console.log("\n--- Preflight ---");
  const p = await runPreflight();
  console.log("ready:", p.ready);
  console.log("reasons:", p.reasons);
  console.log("diagnostics:", JSON.stringify(p.diagnostics, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
