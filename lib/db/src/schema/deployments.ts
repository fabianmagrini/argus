import { pgTable, pgEnum, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams.js";
import { repositoriesTable } from "./repositories.js";

/** PostgreSQL enum type for deployment lifecycle states. */
export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending",
  "running",
  "success",
  "failed",
  "rolled_back",
]);

export type DeploymentStatus = (typeof deploymentStatusEnum.enumValues)[number];

/**
 * `deployments` table — records one deploy of a repository to an environment.
 *
 * `lead_time_seconds` captures the DORA "lead time for changes" metric — the
 * elapsed time from the triggering commit to when this deployment was recorded.
 * Callers are responsible for computing and supplying this value.
 */
export const deploymentsTable = pgTable(
  "deployments",
  {
    id: serial("id").primaryKey(),
    /** Repository being deployed. Cascades on delete. */
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositoriesTable.id, { onDelete: "cascade" }),
    /** Team responsible for the deployment. */
    teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
    /** Target environment (e.g. `"production"`, `"staging"`). */
    environment: text("environment").notNull(),
    /** Current lifecycle state of the deployment. */
    status: deploymentStatusEnum("status").notNull().default("pending"),
    /** Git commit SHA that was deployed. */
    commitSha: text("commit_sha"),
    /** Semantic version or release tag. */
    version: text("version"),
    /**
     * Seconds from the commit that triggered this deployment to the deployment
     * start time. Used to compute DORA Lead Time for Changes.
     */
    leadTimeSeconds: integer("lead_time_seconds"),
    /** When the deployment was initiated. */
    deployedAt: timestamp("deployed_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the deployment finished (success or failure). */
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Covers all period-range queries; leading on deployed_at serves both
    // global and team-filtered analytics queries.
    index("deployments_deployed_at_team_id_idx").on(table.deployedAt, table.teamId),
  ],
);

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
