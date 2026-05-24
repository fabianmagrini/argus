import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams.js";

/**
 * `repositories` table — source-control repositories tracked for metrics.
 *
 * `full_name` is unique (e.g. `"org/repo"`) and acts as the stable external
 * identifier used when syncing data from GitHub or other SCM providers.
 */
export const repositoriesTable = pgTable("repositories", {
  id: serial("id").primaryKey(),
  /** Owning team — nullable, repositories may exist without a team assignment. */
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  /** Short repository name (e.g. `"api-server"`). */
  name: text("name").notNull(),
  /** Fully-qualified name, e.g. `"acme-corp/api-server"`. Must be unique. */
  fullName: text("full_name").notNull().unique(),
  /** Web URL to the repository, if available. */
  url: text("url"),
  /** Default branch name (e.g. `"main"`). */
  defaultBranch: text("default_branch").notNull().default("main"),
  /** Primary programming language, as reported by the SCM provider. */
  language: text("language"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertRepositorySchema = createInsertSchema(repositoriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositoriesTable.$inferSelect;
