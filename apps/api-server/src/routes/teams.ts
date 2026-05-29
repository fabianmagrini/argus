import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { teamsTable } from "@argus/db";
import type { Db } from "./index.js";
import {
  ListTeamsQueryParams,
  ListTeamsResponse,
  CreateTeamBody,
  GetTeamParams,
  GetTeamResponse,
  UpdateTeamParams,
  UpdateTeamBody,
  UpdateTeamResponse,
  DeleteTeamParams,
} from "@argus/api-zod";

/**
 * Create the teams router.
 *
 * Endpoints:
 * - `GET    /teams`     — list all teams ordered by creation date
 * - `POST   /teams`     — create a new team
 * - `GET    /teams/:id` — get a single team by ID
 * - `PATCH  /teams/:id` — update team fields
 * - `DELETE /teams/:id` — delete a team (cascades to repositories etc.)
 *
 * @param db - Drizzle client injected for testability.
 */
export function createTeamsRouter(db: Db): IRouter {
  const router: IRouter = Router();

  router.get("/teams", async (req, res): Promise<void> => {
    const query = ListTeamsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const teams = await db
      .select()
      .from(teamsTable)
      .orderBy(teamsTable.createdAt)
      .limit(query.data.limit)
      .offset(query.data.offset);
    res.json(ListTeamsResponse.parse(teams));
  });

  router.post("/teams", async (req, res): Promise<void> => {
    const parsed = CreateTeamBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [team] = await db.insert(teamsTable).values(parsed.data).returning();
    res.status(201).json(GetTeamResponse.parse(team));
  });

  router.get("/teams/:id", async (req, res): Promise<void> => {
    const params = GetTeamParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    res.json(GetTeamResponse.parse(team));
  });

  router.patch("/teams/:id", async (req, res): Promise<void> => {
    const params = UpdateTeamParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateTeamBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [team] = await db
      .update(teamsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(teamsTable.id, params.data.id))
      .returning();
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    res.json(UpdateTeamResponse.parse(team));
  });

  router.delete("/teams/:id", async (req, res): Promise<void> => {
    const params = DeleteTeamParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [team] = await db
      .delete(teamsTable)
      .where(eq(teamsTable.id, params.data.id))
      .returning();
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    res.sendStatus(204);
  });

  return router;
}
