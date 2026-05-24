import { Router, type IRouter } from "express";
import { db as realDb } from "@argus/db";
import { createHealthRouter } from "./health.js";
import { createTeamsRouter } from "./teams.js";
import { createRepositoriesRouter } from "./repositories.js";
import { createDeploymentsRouter } from "./deployments.js";
import { createPullRequestsRouter } from "./pull_requests.js";
import { createIncidentsRouter } from "./incidents.js";
import { createEventsRouter } from "./events.js";
import { createMetricsRouter } from "./metrics.js";

/** Subset of the Drizzle client accepted by all route factories. */
export type Db = typeof realDb;

/**
 * Create the root API router with all sub-routers mounted.
 *
 * @param db - Drizzle client (defaults to the real DB from `@argus/db`).
 *             Pass a mock when testing routes in isolation.
 */
export function createRouter(db: Db = realDb): IRouter {
  const router: IRouter = Router();

  router.use(createHealthRouter());
  router.use(createTeamsRouter(db));
  router.use(createRepositoriesRouter(db));
  router.use(createDeploymentsRouter(db));
  router.use(createPullRequestsRouter(db));
  router.use(createIncidentsRouter(db));
  router.use(createEventsRouter(db));
  router.use(createMetricsRouter(db));

  return router;
}
