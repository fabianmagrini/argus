import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { incidentsTable } from "@argus/db";
import type { Db } from "./index.js";
import {
  ListIncidentsQueryParams,
  ListIncidentsResponse,
  CreateIncidentBody,
  GetIncidentParams,
  GetIncidentResponse,
  UpdateIncidentParams,
  UpdateIncidentBody,
  UpdateIncidentResponse,
} from "@argus/api-zod";

/**
 * Create the incidents router.
 *
 * Endpoints:
 * - `GET   /incidents`      — list incidents, filterable by team, severity, status
 * - `POST  /incidents`      — record an incident
 * - `GET   /incidents/:id`  — get a single incident
 * - `PATCH /incidents/:id`  — update status, severity, recovery time
 *
 * @param db - Drizzle client injected for testability.
 */
export function createIncidentsRouter(db: Db): IRouter {
  const router: IRouter = Router();

  router.get("/incidents", async (req, res): Promise<void> => {
    const query = ListIncidentsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const conditions = [];
    if (query.data.teamId) conditions.push(eq(incidentsTable.teamId, query.data.teamId));
    if (query.data.severity) conditions.push(eq(incidentsTable.severity, query.data.severity));
    if (query.data.status) conditions.push(eq(incidentsTable.status, query.data.status));

    const incidents = await db
      .select()
      .from(incidentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(incidentsTable.openedAt))
      .limit(query.data.limit ?? 50);
    res.json(ListIncidentsResponse.parse(incidents));
  });

  router.post("/incidents", async (req, res): Promise<void> => {
    const parsed = CreateIncidentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [incident] = await db.insert(incidentsTable).values(parsed.data).returning();
    res.status(201).json(GetIncidentResponse.parse(incident));
  });

  router.get("/incidents/:id", async (req, res): Promise<void> => {
    const params = GetIncidentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [incident] = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, params.data.id));
    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }
    res.json(GetIncidentResponse.parse(incident));
  });

  router.patch("/incidents/:id", async (req, res): Promise<void> => {
    const params = UpdateIncidentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateIncidentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [incident] = await db
      .update(incidentsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(incidentsTable.id, params.data.id))
      .returning();
    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }
    res.json(UpdateIncidentResponse.parse(incident));
  });

  return router;
}
