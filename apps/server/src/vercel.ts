import type { FastifyInstance } from "fastify";
import { seedIfEmpty } from "./core/db.ts";
import { buildServer } from "./server.ts";
import { startTycheLoop } from "./tyche/routes.ts";
import { initTreasury } from "./treasury/routes.ts";

let app: FastifyInstance | null = null;
let booted = false;

/** Lazy singleton for Vercel serverless — no listen(), scans on HTTP poll. */
export async function getVercelApp(): Promise<FastifyInstance> {
  if (app) return app;

  if (!booted) {
    seedIfEmpty();
    initTreasury();
    startTycheLoop();
    booted = true;
  }

  app = buildServer();
  await app.ready();
  return app;
}
