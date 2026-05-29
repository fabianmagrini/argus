import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { repositoriesTable } from "@argus/db";
import type { Db } from "./index.js";
import {
  ListRepositoriesQueryParams,
  ListRepositoriesResponse,
  CreateRepositoryBody,
  GetRepositoryParams,
  GetRepositoryResponse,
  UpdateRepositoryParams,
  UpdateRepositoryBody,
  UpdateRepositoryResponse,
  DeleteRepositoryParams,
} from "@argus/api-zod";

/**
 * Create the repositories router.
 *
 * Endpoints:
 * - `GET    /repositories`        — list repos, optionally filtered by `teamId`
 * - `POST   /repositories`        — register a new repository
 * - `GET    /repositories/:id`    — get a single repository
 * - `PATCH  /repositories/:id`    — update repository fields
 * - `DELETE /repositories/:id`    — delete a repository (cascades PRs, deployments)
 *
 * @param db - Drizzle client injected for testability.
 */
export function createRepositoriesRouter(db: Db): IRouter {
  const router: IRouter = Router();

  router.get("/repositories", async (req, res): Promise<void> => {
    const query = ListRepositoriesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const conditions = query.data.teamId
      ? [eq(repositoriesTable.teamId, query.data.teamId)]
      : [];
    const repos = await db
      .select()
      .from(repositoriesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(repositoriesTable.createdAt)
      .limit(query.data.limit)
      .offset(query.data.offset);
    res.json(ListRepositoriesResponse.parse(repos));
  });

  router.post("/repositories", async (req, res): Promise<void> => {
    const parsed = CreateRepositoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [repo] = await db.insert(repositoriesTable).values(parsed.data).returning();
    res.status(201).json(GetRepositoryResponse.parse(repo));
  });

  router.get("/repositories/:id", async (req, res): Promise<void> => {
    const params = GetRepositoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [repo] = await db
      .select()
      .from(repositoriesTable)
      .where(eq(repositoriesTable.id, params.data.id));
    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }
    res.json(GetRepositoryResponse.parse(repo));
  });

  router.patch("/repositories/:id", async (req, res): Promise<void> => {
    const params = UpdateRepositoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateRepositoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [repo] = await db
      .update(repositoriesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(repositoriesTable.id, params.data.id))
      .returning();
    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }
    res.json(UpdateRepositoryResponse.parse(repo));
  });

  router.delete("/repositories/:id", async (req, res): Promise<void> => {
    const params = DeleteRepositoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [repo] = await db
      .delete(repositoriesTable)
      .where(eq(repositoriesTable.id, params.data.id))
      .returning();
    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }
    res.sendStatus(204);
  });

  return router;
}
