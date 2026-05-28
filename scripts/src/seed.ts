/**
 * Seed script — populates the dev database with realistic sample data.
 *
 * Usage:
 *   pnpm --filter @argus/scripts run seed
 *
 * Or with a custom database URL:
 *   DATABASE_URL=postgresql://... pnpm --filter @argus/scripts run seed
 *
 * The script is NOT idempotent — run against a fresh database or after
 * wiping tables. Re-running will fail on unique constraints (e.g. team names).
 * To reset: docker compose down -v && docker compose up -d && pnpm --filter @argus/db run push
 */

import {
  db,
  pool,
  teamsTable,
  repositoriesTable,
  deploymentsTable,
  pullRequestsTable,
  incidentsTable,
  eventsTable,
} from "@argus/db";

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3_600_000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Teams ─────────────────────────────────────────────────────────────────────

console.log("Seeding teams...");
const [platform, frontend, data] = await db
  .insert(teamsTable)
  .values([
    { name: "Platform", description: "Core infrastructure and developer tooling", timezone: "UTC" },
    { name: "Frontend", description: "React apps and design system", timezone: "America/New_York" },
    { name: "Data", description: "Data pipelines, analytics, ML", timezone: "Europe/London" },
  ])
  .returning();

const teams = [platform, frontend, data];
console.log(`  Created ${teams.length} teams`);

// ── Repositories ──────────────────────────────────────────────────────────────

console.log("Seeding repositories...");
const [apiRepo, webRepo, pipelineRepo, sharedRepo] = await db
  .insert(repositoriesTable)
  .values([
    { teamId: platform.id, name: "api-server", fullName: "acme/api-server", defaultBranch: "main", language: "TypeScript", url: "https://github.com/acme/api-server" },
    { teamId: frontend.id, name: "web-app", fullName: "acme/web-app", defaultBranch: "main", language: "TypeScript", url: "https://github.com/acme/web-app" },
    { teamId: data.id, name: "data-pipeline", fullName: "acme/data-pipeline", defaultBranch: "main", language: "Python", url: "https://github.com/acme/data-pipeline" },
    { teamId: platform.id, name: "shared-libs", fullName: "acme/shared-libs", defaultBranch: "main", language: "TypeScript" },
  ])
  .returning();

const repos = [apiRepo, webRepo, pipelineRepo, sharedRepo];
console.log(`  Created ${repos.length} repositories`);

// ── Deployments ───────────────────────────────────────────────────────────────
// Platform deploys frequently (elite), Frontend moderately (high), Data rarely (medium).

console.log("Seeding deployments...");

const deploymentRows = [];

// Platform — ~2 deploys/day for 30 days
for (let i = 0; i < 58; i++) {
  const daysBack = Math.random() * 30;
  const status = Math.random() < 0.06 ? pick(["failed", "rolled_back"] as const) : "success";
  deploymentRows.push({
    repositoryId: pick([apiRepo.id, sharedRepo.id]),
    teamId: platform.id,
    environment: "production",
    status,
    commitSha: Math.random().toString(16).slice(2, 9),
    version: `1.${Math.floor(i / 3)}.${i % 3}`,
    leadTimeSeconds: Math.floor(Math.random() * 3600 + 600),
    deployedAt: daysAgo(daysBack),
  });
}

// Frontend — ~1 deploy/day for 30 days
for (let i = 0; i < 28; i++) {
  const daysBack = Math.random() * 30;
  const status = Math.random() < 0.10 ? pick(["failed", "rolled_back"] as const) : "success";
  deploymentRows.push({
    repositoryId: webRepo.id,
    teamId: frontend.id,
    environment: "production",
    status,
    commitSha: Math.random().toString(16).slice(2, 9),
    version: `2.${i}.0`,
    leadTimeSeconds: Math.floor(Math.random() * 7200 + 1800),
    deployedAt: daysAgo(daysBack),
  });
}

// Data — ~1 deploy/week (medium)
for (let i = 0; i < 4; i++) {
  const status = Math.random() < 0.14 ? "failed" as const : "success" as const;
  deploymentRows.push({
    repositoryId: pipelineRepo.id,
    teamId: data.id,
    environment: "production",
    status,
    commitSha: Math.random().toString(16).slice(2, 9),
    version: `0.${i + 1}.0`,
    leadTimeSeconds: Math.floor(Math.random() * 86400 + 14400),
    deployedAt: daysAgo(i * 7 + 1),
  });
}

await db.insert(deploymentsTable).values(deploymentRows);
console.log(`  Created ${deploymentRows.length} deployments`);

// ── Pull Requests ─────────────────────────────────────────────────────────────

console.log("Seeding pull requests...");

const prRows = [];

// Platform — quick cycle times (elite lead time)
for (let i = 0; i < 22; i++) {
  const openedAt = daysAgo(Math.random() * 30 + 1);
  const state = i < 18 ? "merged" as const : (i < 20 ? "closed" as const : "open" as const);
  const cycleTimeSeconds = state === "merged" ? Math.floor(Math.random() * 3600 + 900) : undefined;
  prRows.push({
    repositoryId: pick([apiRepo.id, sharedRepo.id]),
    teamId: platform.id,
    externalId: 100 + i,
    title: `feat: ${pick(["add caching layer", "improve query perf", "refactor auth", "add metrics endpoint", "fix rate limiter"])} (#${100 + i})`,
    authorLogin: pick(["alice", "bob", "carlos"]),
    state,
    additions: Math.floor(Math.random() * 300 + 20),
    deletions: Math.floor(Math.random() * 150 + 5),
    changedFiles: Math.floor(Math.random() * 15 + 1),
    cycleTimeSeconds,
    openedAt,
    mergedAt: state === "merged" ? new Date(openedAt.getTime() + (cycleTimeSeconds ?? 0) * 1000) : undefined,
  });
}

// Frontend — moderate cycle times
for (let i = 0; i < 18; i++) {
  const openedAt = daysAgo(Math.random() * 30 + 1);
  const state = i < 14 ? "merged" as const : (i < 16 ? "closed" as const : "open" as const);
  const cycleTimeSeconds = state === "merged" ? Math.floor(Math.random() * 86400 + 7200) : undefined;
  prRows.push({
    repositoryId: webRepo.id,
    teamId: frontend.id,
    externalId: 200 + i,
    title: `feat: ${pick(["update nav component", "fix mobile layout", "add dark mode", "redesign dashboard", "improve a11y"])} (#${200 + i})`,
    authorLogin: pick(["diana", "evan", "farah"]),
    state,
    additions: Math.floor(Math.random() * 500 + 50),
    deletions: Math.floor(Math.random() * 200 + 10),
    changedFiles: Math.floor(Math.random() * 25 + 2),
    cycleTimeSeconds,
    openedAt,
    mergedAt: state === "merged" ? new Date(openedAt.getTime() + (cycleTimeSeconds ?? 0) * 1000) : undefined,
  });
}

// Data — slower cycle times
for (let i = 0; i < 8; i++) {
  const openedAt = daysAgo(Math.random() * 30 + 2);
  const state = i < 6 ? "merged" as const : "open" as const;
  const cycleTimeSeconds = state === "merged" ? Math.floor(Math.random() * 259200 + 86400) : undefined;
  prRows.push({
    repositoryId: pipelineRepo.id,
    teamId: data.id,
    externalId: 300 + i,
    title: `feat: ${pick(["new ETL pipeline", "add data validation", "fix schema drift", "update dependencies", "add monitoring"])} (#${300 + i})`,
    authorLogin: pick(["george", "hannah"]),
    state,
    additions: Math.floor(Math.random() * 800 + 100),
    deletions: Math.floor(Math.random() * 400 + 20),
    changedFiles: Math.floor(Math.random() * 30 + 3),
    cycleTimeSeconds,
    openedAt,
    mergedAt: state === "merged" ? new Date(openedAt.getTime() + (cycleTimeSeconds ?? 0) * 1000) : undefined,
  });
}

await db.insert(pullRequestsTable).values(prRows);
console.log(`  Created ${prRows.length} pull requests`);

// ── Incidents ─────────────────────────────────────────────────────────────────

console.log("Seeding incidents...");

const incidentRows = [
  // Platform — fast MTTR (elite)
  {
    teamId: platform.id,
    title: "API latency spike — upstream timeout",
    severity: "p2" as const,
    status: "resolved" as const,
    recoveryTimeSeconds: 1800,
    openedAt: daysAgo(25),
    resolvedAt: hoursAgo(25 * 24 - 0.5),
  },
  {
    teamId: platform.id,
    title: "Certificate renewal failure",
    severity: "p1" as const,
    status: "resolved" as const,
    recoveryTimeSeconds: 2700,
    openedAt: daysAgo(12),
    resolvedAt: hoursAgo(12 * 24 - 0.75),
  },
  {
    teamId: platform.id,
    title: "Background job queue stalled",
    severity: "p3" as const,
    status: "resolved" as const,
    recoveryTimeSeconds: 900,
    openedAt: daysAgo(5),
    resolvedAt: hoursAgo(5 * 24 - 0.25),
  },
  // Frontend — moderate MTTR
  {
    teamId: frontend.id,
    title: "Dashboard blank screen on Safari",
    severity: "p2" as const,
    status: "resolved" as const,
    recoveryTimeSeconds: 14400,
    openedAt: daysAgo(20),
    resolvedAt: hoursAgo(20 * 24 - 4),
  },
  {
    teamId: frontend.id,
    title: "Login redirect loop in production",
    severity: "p1" as const,
    status: "resolved" as const,
    recoveryTimeSeconds: 5400,
    openedAt: daysAgo(8),
    resolvedAt: hoursAgo(8 * 24 - 1.5),
  },
  {
    teamId: frontend.id,
    title: "Broken image uploads on Firefox",
    severity: "p3" as const,
    status: "open" as const,
    openedAt: daysAgo(2),
  },
  // Data — slow MTTR (medium/low)
  {
    teamId: data.id,
    title: "Nightly ETL job failed — schema mismatch",
    severity: "p2" as const,
    status: "resolved" as const,
    recoveryTimeSeconds: 72000,
    openedAt: daysAgo(18),
    resolvedAt: hoursAgo(18 * 24 - 20),
  },
  {
    teamId: data.id,
    title: "Data warehouse query timeout",
    severity: "p3" as const,
    status: "open" as const,
    openedAt: daysAgo(3),
  },
];

await db.insert(incidentsTable).values(incidentRows);
console.log(`  Created ${incidentRows.length} incidents`);

// ── Events ────────────────────────────────────────────────────────────────────

console.log("Seeding events...");

const eventRows = [];
const eventTypes = ["github.push", "github.review_assigned", "ci.pass", "ci.fail", "github.comment"];

for (let i = 0; i < 30; i++) {
  const team = pick(teams);
  const repo = repos.find((r) => r.teamId === team.id) ?? apiRepo;
  eventRows.push({
    teamId: team.id,
    repositoryId: repo.id,
    type: pick(eventTypes),
    actorLogin: pick(["alice", "bob", "carlos", "diana", "evan", "farah"]),
    metadata: { ref: "refs/heads/main", sha: Math.random().toString(16).slice(2, 9) },
    occurredAt: daysAgo(Math.random() * 30),
  });
}

await db.insert(eventsTable).values(eventRows);
console.log(`  Created ${eventRows.length} events`);

// ── Done ──────────────────────────────────────────────────────────────────────

console.log("\nSeed complete.");
console.log("  Teams:", teams.map((t) => t.name).join(", "));
console.log("  Repos:", repos.map((r) => r.fullName).join(", "));
console.log(`  ${deploymentRows.length} deployments, ${prRows.length} PRs, ${incidentRows.length} incidents, ${eventRows.length} events`);

await pool.end();
