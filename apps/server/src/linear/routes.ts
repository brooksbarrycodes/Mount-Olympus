import type { FastifyInstance } from "fastify";
import {
  listTeams,
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  completeIssue,
  addComment,
  linearIsConfigured,
} from "../tools/linear.ts";

export function registerLinearRoutes(app: FastifyInstance): void {
  app.get("/linear/status", async () => ({
    configured: linearIsConfigured(),
  }));

  app.get("/linear/teams", async () => ({ teams: await listTeams() }));

  app.get<{ Querystring: { team?: string } }>("/linear/issues", async (req) => ({
    issues: await listIssues(req.query.team),
  }));

  app.get<{ Params: { id: string } }>("/linear/issues/:id", async (req, reply) => {
    const issue = await getIssue(req.params.id);
    if (!issue) return reply.code(404).send({ error: "not found" });
    return { issue };
  });

  app.post<{ Body: { title?: string; description?: string; teamId?: string; priority?: number; dueDate?: string } }>(
    "/linear/issues",
    async (req, reply) => {
      const title = String(req.body?.title ?? "").trim();
      if (!title) return reply.code(400).send({ error: "title required" });
      const issue = await createIssue({
        title,
        description: req.body?.description,
        teamId: req.body?.teamId,
        priority: req.body?.priority,
        dueDate: req.body?.dueDate,
      });
      return { ok: true, issue };
    },
  );

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/linear/issues/:id",
    async (req) => {
      const issue = await updateIssue(req.params.id, {
        title: req.body.title as string | undefined,
        description: req.body.description as string | undefined,
        state: req.body.state as string | undefined,
        priority: req.body.priority as number | undefined,
        dueDate: req.body.dueDate as string | undefined,
      });
      return { ok: true, issue };
    },
  );

  app.post<{ Params: { id: string } }>("/linear/issues/:id/complete", async (req) => ({
    ok: true,
    issue: await completeIssue(req.params.id),
  }));

  app.post<{ Params: { id: string }; Body: { body?: string } }>(
    "/linear/issues/:id/comments",
    async (req, reply) => {
      const body = String(req.body?.body ?? "").trim();
      if (!body) return reply.code(400).send({ error: "body required" });
      return addComment(req.params.id, body);
    },
  );
}
