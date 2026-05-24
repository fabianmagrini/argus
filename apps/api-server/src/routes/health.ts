import { Router, type IRouter } from "express";

/**
 * Create the health check router.
 *
 * `GET /healthz` — returns `{ status: "ok" }` with HTTP 200.
 * Used by load balancers and container orchestrators to verify liveness.
 */
export function createHealthRouter(): IRouter {
  const router: IRouter = Router();

  router.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  return router;
}
