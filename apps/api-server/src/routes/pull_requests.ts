import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { pullRequestsTable } from "@argus/db";
import type { Db } from "./index.js";
import {
  ListPullRequestsQueryParams,
  ListPullRequestsResponse,
  CreatePullRequestBody,
  GetPullRequestParams,
  GetPullRequestResponse,
  UpdatePullRequestParams,
  UpdatePullRequestBody,
  UpdatePullRequestResponse,
} from "@argus/api-zod";

/**
 * Create the pull requests router.
 *
 * Endpoints:
 * - `GET   /pull-requests`      — list PRs, filterable by team, repo, state
 * - `POST  /pull-requests`      — record a pull request
 * - `GET   /pull-requests/:id`  — get a single PR
 * - `PATCH /pull-requests/:id`  — update PR state, cycle time, size metrics
 *
 * @param db - Drizzle client injected for testability.
 */
export function createPullRequestsRouter(db: Db): IRouter {
  const router: IRouter = Router();

  router.get("/pull-requests", async (req, res): Promise<void> => {
    const query = ListPullRequestsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const conditions = [];
    if (query.data.teamId) conditions.push(eq(pullRequestsTable.teamId, query.data.teamId));
    if (query.data.repositoryId) conditions.push(eq(pullRequestsTable.repositoryId, query.data.repositoryId));
    if (query.data.state) conditions.push(eq(pullRequestsTable.state, query.data.state));

    const prs = await db
      .select()
      .from(pullRequestsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(pullRequestsTable.openedAt))
      .limit(query.data.limit ?? 50);
    res.json(ListPullRequestsResponse.parse(prs));
  });

  router.post("/pull-requests", async (req, res): Promise<void> => {
    const parsed = CreatePullRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [pr] = await db.insert(pullRequestsTable).values(parsed.data).returning();
    res.status(201).json(GetPullRequestResponse.parse(pr));
  });

  router.get("/pull-requests/:id", async (req, res): Promise<void> => {
    const params = GetPullRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [pr] = await db
      .select()
      .from(pullRequestsTable)
      .where(eq(pullRequestsTable.id, params.data.id));
    if (!pr) {
      res.status(404).json({ error: "Pull request not found" });
      return;
    }
    res.json(GetPullRequestResponse.parse(pr));
  });

  router.patch("/pull-requests/:id", async (req, res): Promise<void> => {
    const params = UpdatePullRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdatePullRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [pr] = await db
      .update(pullRequestsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(pullRequestsTable.id, params.data.id))
      .returning();
    if (!pr) {
      res.status(404).json({ error: "Pull request not found" });
      return;
    }
    res.json(UpdatePullRequestResponse.parse(pr));
  });

  return router;
}
