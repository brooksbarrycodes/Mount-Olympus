import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getVercelApp } from "../apps/server/src/vercel.ts";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const app = await getVercelApp();

  const segments = req.query.path;
  const parts = Array.isArray(segments) ? segments : segments ? [segments] : [];
  const pathname = parts.length ? `/${parts.join("/")}` : "/";
  const queryStart = req.url?.indexOf("?") ?? -1;
  const query = queryStart >= 0 ? req.url!.slice(queryStart) : "";

  req.url = pathname + query;
  app.server.emit("request", req, res);
}
