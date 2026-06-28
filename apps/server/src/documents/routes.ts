import type { FastifyInstance } from "fastify";
import { getDocument, listDocuments, startResearch } from "./store.ts";
import type { DocumentKind } from "./store.ts";

export function registerDocumentRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { limit?: string } }>("/documents", async (req) => ({
    documents: listDocuments(Number(req.query?.limit ?? 50)),
  }));

  app.get<{ Params: { id: string } }>("/documents/:id", async (req, reply) => {
    const doc = getDocument(Number(req.params.id));
    if (!doc) return reply.code(404).send({ error: "not found" });
    return { document: doc };
  });

  app.post<{ Body: { topic?: string; kind?: string } }>("/documents/research", async (req, reply) => {
    const topic = String(req.body?.topic ?? "").trim();
    if (!topic) return reply.code(400).send({ error: "topic required" });
    const kind = (req.body?.kind ?? "research") as DocumentKind;
    const doc = await startResearch(topic, kind);
    return { ok: true, document: doc };
  });
}
