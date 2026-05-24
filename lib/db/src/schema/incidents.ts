import { pgTable, pgEnum, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams.js";

/** PostgreSQL enum type for incident severity. P1 = most critical, P4 = informational. */
export const incidentSeverityEnum = pgEnum("incident_severity", ["p1", "p2", "p3", "p4"]);
export type IncidentSeverity = (typeof incidentSeverityEnum.enumValues)[number];

/** PostgreSQL enum type for incident lifecycle state. */
export const incidentStatusEnum = pgEnum("incident_status", ["open", "resolved"]);
export type IncidentStatus = (typeof incidentStatusEnum.enumValues)[number];

/**
 * `incidents` table — production service disruptions.
 *
 * `recovery_time_seconds` is the DORA "Mean Time to Recovery" (MTTR) raw value —
 * elapsed seconds from `opened_at` to `resolved_at`. Callers supply this.
 */
export const incidentsTable = pgTable(
  "incidents",
  {
    id: serial("id").primaryKey(),
    /** Team responsible for resolving the incident. */
    teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    /** Incident severity level (P1 = most critical, P4 = informational). */
    severity: incidentSeverityEnum("severity").notNull().default("p3"),
    status: incidentStatusEnum("status").notNull().default("open"),
    /**
     * Seconds from `opened_at` to `resolved_at`.
     * Used to compute the DORA Mean Time to Recovery metric.
     */
    recoveryTimeSeconds: integer("recovery_time_seconds"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Covers DORA MTTR and leaderboard queries; leading on opened_at serves
    // both global and team-filtered incident queries.
    index("incidents_opened_at_team_id_idx").on(table.openedAt, table.teamId),
  ],
);

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
