import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * `teams` table — logical grouping for repositories and engineers.
 *
 * All other domain entities (repositories, deployments, pull requests,
 * incidents, events) can optionally belong to a team via a `team_id` foreign key.
 */
export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  /** Human-readable team name, must be unique within the organisation. */
  name: text("name").notNull().unique(),
  /** Optional free-text description of the team's scope or responsibilities. */
  description: text("description"),
  /** IANA timezone identifier used when displaying local times for this team. */
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Zod schema for inserting a new team row. */
export const insertTeamSchema = createInsertSchema(teamsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;
