import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { eventsTable } from "@argus/db";
import type { Db } from "./index.js";
import {
  IngestEventBody,
  ListEventsQueryParams,
  ListEventsResponse,
  ListEventsResponseItem,
} from "@argus/api-zod";

/**
 * Create the events router.
 *
 * Endpoints:
 * - `POST /events` — ingest a raw activity event (HTTP 202 Accepted)
 * - `GET  /events` — list recent events, filterable by team and type
 *
 * @param db - Drizzle client injected for testability.
 */
export function createEventsRouter(db: Db): IRouter {
  const router: IRouter = Router();

  router.post("/events", async (req, res): Promise<void> => {
    const parsed = IngestEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [event] = await db
      .insert(eventsTable)
      .values({
        ...parsed.data,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      })
      .returning();
    res.status(202).json(ListEventsResponseItem.parse(event));
  });

  router.get("/events", async (req, res): Promise<void> => {
    const query = ListEventsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const conditions = [];
    if (query.data.teamId) conditions.push(eq(eventsTable.teamId, query.data.teamId));
    if (query.data.type) conditions.push(eq(eventsTable.type, query.data.type));

    const events = await db
      .select()
      .from(eventsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(eventsTable.occurredAt))
      .limit(query.data.limit)
      .offset(query.data.offset);
    res.json(ListEventsResponse.parse(events));
  });

  return router;
}
