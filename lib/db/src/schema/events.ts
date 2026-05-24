import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams.js";
import { repositoriesTable } from "./repositories.js";

/**
 * `events` table — raw, schema-less activity events.
 *
 * Events are the catch-all ingest path. Use structured tables (deployments,
 * pull_requests, incidents) when possible; reserve events for custom signals
 * such as code review assignments, branch deletions, or CI status hooks.
 *
 * `metadata` is a free-form JSONB blob for any additional context.
 */
export const eventsTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    /** Team the event is attributed to. */
    teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
    /** Repository the event originated from, if applicable. */
    repositoryId: integer("repository_id").references(() => repositoriesTable.id, {
      onDelete: "set null",
    }),
    /**
     * Arbitrary event type string (e.g. `"push"`, `"review_assigned"`, `"ci_pass"`).
     * Consumers should namespace types to avoid collisions: `"github.push"`.
     */
    type: text("type").notNull(),
    /** Login of the user who triggered the event. */
    actorLogin: text("actor_login"),
    /** Free-form key-value payload — any additional context for the event. */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    /** When the event actually occurred (defaults to insertion time). */
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Covers activity-feed queries ordered and filtered by time and team.
    index("events_occurred_at_team_id_idx").on(table.occurredAt, table.teamId),
  ],
);

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
