import type { FastifyInstance } from "fastify";
import { createMission, listMissions, completeMission, deleteMission, getMission } from "./store.ts";

export function registerMissionRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { all?: string } }>("/missions", async (req) => ({
    missions: listMissions(req.query.all === "1"),
  }));

  app.post<{
    Body: { title?: string; description?: string; dueAt?: string; dueInHours?: number; dueInDays?: number };
  }>(
    "/missions",
    async (req, reply) => {
      const title = String(req.body?.title ?? "").trim();
      if (!title) return reply.code(400).send({ error: "title required" });
      let dueAt = req.body?.dueAt ?? null;
      if (!dueAt && req.body?.dueInHours != null) {
        dueAt = new Date(Date.now() + Number(req.body.dueInHours) * 3600_000).toISOString();
      } else if (!dueAt && req.body?.dueInDays != null) {
        dueAt = new Date(Date.now() + Number(req.body.dueInDays) * 86400_000).toISOString();
      }
      const mission = createMission({
        title,
        description: req.body?.description,
        dueAt,
        createdBy: "user",
      });
      return { ok: true, mission };
    },
  );

  app.patch<{ Params: { id: string } }>("/missions/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!getMission(id)) return reply.code(404).send({ error: "not found" });
    const mission = completeMission(id);
    return { ok: true, mission };
  });

  app.delete<{ Params: { id: string } }>("/missions/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!getMission(id)) return reply.code(404).send({ error: "not found" });
    deleteMission(id);
    return { ok: true };
  });
}
