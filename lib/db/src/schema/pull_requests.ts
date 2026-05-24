import { pgTable, pgEnum, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams.js";
import { repositoriesTable } from "./repositories.js";

/** PostgreSQL enum type for pull request lifecycle states. */
export const prStateEnum = pgEnum("pr_state", ["open", "merged", "closed"]);
export type PrState = (typeof prStateEnum.enumValues)[number];

/**
 * `pull_requests` table — tracks individual pull/merge requests.
 *
 * `cycle_time_seconds` is the DORA / flow "cycle time" metric — elapsed seconds
 * from `opened_at` to `merged_at`. Callers supply this; it is not computed here.
 */
export const pullRequestsTable = pgTable(
  "pull_requests",
  {
    id: serial("id").primaryKey(),
    /** Repository the PR belongs to. Cascades on delete. */
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositoriesTable.id, { onDelete: "cascade" }),
    /** Owning team. */
    teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
    /** SCM-provider PR number (e.g. GitHub PR number). */
    externalId: integer("external_id"),
    title: text("title").notNull(),
    /** GitHub / GitLab login of the PR author. */
    authorLogin: text("author_login"),
    /** Current PR state. */
    state: prStateEnum("state").notNull().default("open"),
    /** Lines added in this PR. */
    additions: integer("additions"),
    /** Lines removed in this PR. */
    deletions: integer("deletions"),
    /** Number of files changed. */
    changedFiles: integer("changed_files"),
    /**
     * Elapsed seconds from `opened_at` to `merged_at`.
     * Used to compute DORA Lead Time and flow Cycle Time metrics.
     */
    cycleTimeSeconds: integer("cycle_time_seconds"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Covers period-range queries; leading on opened_at serves both global
    // and team-filtered flow/summary analytics queries.
    index("pull_requests_opened_at_team_id_idx").on(table.openedAt, table.teamId),
  ],
);

export const insertPullRequestSchema = createInsertSchema(pullRequestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPullRequest = z.infer<typeof insertPullRequestSchema>;
export type PullRequest = typeof pullRequestsTable.$inferSelect;
