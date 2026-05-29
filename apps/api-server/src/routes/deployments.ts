import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { deploymentsTable } from "@argus/db";
import type { Db } from "./index.js";
import {
  ListDeploymentsQueryParams,
  ListDeploymentsResponse,
  CreateDeploymentBody,
  GetDeploymentParams,
  GetDeploymentResponse,
  UpdateDeploymentParams,
  UpdateDeploymentBody,
  UpdateDeploymentResponse,
} from "@argus/api-zod";

/**
 * Create the deployments router.
 *
 * Endpoints:
 * - `GET   /deployments`      — list deployments, filterable by team, repo, status
 * - `POST  /deployments`      — record a new deployment
 * - `GET   /deployments/:id`  — get a single deployment
 * - `PATCH /deployments/:id`  — update deployment status / lead time / finishedAt
 *
 * @param db - Drizzle client injected for testability.
 */
export function createDeploymentsRouter(db: Db): IRouter {
  const router: IRouter = Router();

  router.get("/deployments", async (req, res): Promise<void> => {
    const query = ListDeploymentsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const conditions = [];
    if (query.data.teamId) conditions.push(eq(deploymentsTable.teamId, query.data.teamId));
    if (query.data.repositoryId) conditions.push(eq(deploymentsTable.repositoryId, query.data.repositoryId));
    if (query.data.status) conditions.push(eq(deploymentsTable.status, query.data.status));

    const deployments = await db
      .select()
      .from(deploymentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(deploymentsTable.deployedAt))
      .limit(query.data.limit)
      .offset(query.data.offset);
    res.json(ListDeploymentsResponse.parse(deployments));
  });

  router.post("/deployments", async (req, res): Promise<void> => {
    const parsed = CreateDeploymentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [deployment] = await db.insert(deploymentsTable).values(parsed.data).returning();
    res.status(201).json(GetDeploymentResponse.parse(deployment));
  });

  router.get("/deployments/:id", async (req, res): Promise<void> => {
    const params = GetDeploymentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [deployment] = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.id, params.data.id));
    if (!deployment) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    res.json(GetDeploymentResponse.parse(deployment));
  });

  router.patch("/deployments/:id", async (req, res): Promise<void> => {
    const params = UpdateDeploymentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateDeploymentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [deployment] = await db
      .update(deploymentsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(deploymentsTable.id, params.data.id))
      .returning();
    if (!deployment) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    res.json(UpdateDeploymentResponse.parse(deployment));
  });

  return router;
}
