import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, count, avg, sql, isNotNull, inArray } from "drizzle-orm";
import {
  deploymentsTable,
  pullRequestsTable,
  incidentsTable,
  teamsTable,
  repositoriesTable,
} from "@argus/db";
import type { Db } from "./index.js";
import {
  classifyDoraRating,
  overallDoraRating,
  computeHealthScore,
  computeLeaderboardScore,
  getPeriodStart,
  getPeriodDays,
  type DoraRating,
  type Period,
} from "@argus/metrics";
import {
  GetMetricsSummaryQueryParams,
  GetMetricsSummaryResponse,
  GetDoraMetricsQueryParams,
  GetDoraMetricsResponse,
  GetDoraTimeseriesQueryParams,
  GetDoraTimeseriesResponse,
  GetFlowMetricsQueryParams,
  GetFlowMetricsResponse,
  GetTeamHealthMetricsQueryParams,
  GetTeamHealthMetricsResponse,
  GetActivityFeedQueryParams,
  GetActivityFeedResponse,
  GetTeamLeaderboardQueryParams,
  GetTeamLeaderboardResponse,
} from "@argus/api-zod";

/**
 * Create the metrics router — all analytics endpoints.
 *
 * Metrics are computed on-the-fly from raw event tables; there is no
 * pre-aggregation pipeline. All computation uses helpers from `@argus/metrics`.
 *
 * Endpoints:
 * - `GET /metrics/summary`        — KPI summary (total deploys, success rate, DORA rating)
 * - `GET /metrics/dora`           — DORA four-key metrics with trend vs previous period
 * - `GET /metrics/dora/timeseries`— Daily time-series for one DORA metric
 * - `GET /metrics/flow`           — Flow metrics (cycle time, throughput, WIP)
 * - `GET /metrics/team-health`    — Health scores per team
 * - `GET /metrics/activity`       — Unified activity feed (deploys + PRs + incidents)
 * - `GET /metrics/leaderboard`    — Ranked team performance table
 *
 * @param db - Drizzle client injected for testability.
 */
export function createMetricsRouter(db: Db): IRouter {
  const router: IRouter = Router();

  // ── /metrics/summary ────────────────────────────────────────────────────

  router.get("/metrics/summary", async (req, res): Promise<void> => {
    const query = GetMetricsSummaryQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const period = (query.data.period ?? "30d") as Period;
    const periodStart = getPeriodStart(period);
    const periodDays = getPeriodDays(period);
    const teamFilter = query.data.teamId ? eq(deploymentsTable.teamId, query.data.teamId) : undefined;

    const [deployStats] = await db.select({
      total: count(),
      succeeded: sql<number>`count(*) filter (where status = 'success')`,
      failed: sql<number>`count(*) filter (where status = 'failed' or status = 'rolled_back')`,
      avgLeadTime: avg(deploymentsTable.leadTimeSeconds),
    }).from(deploymentsTable).where(and(gte(deploymentsTable.deployedAt, periodStart), teamFilter));

    const [prStats] = await db.select({
      total: count(),
      merged: sql<number>`count(*) filter (where state = 'merged')`,
      avgCycleTime: avg(pullRequestsTable.cycleTimeSeconds),
    }).from(pullRequestsTable).where(
      and(
        gte(pullRequestsTable.openedAt, periodStart),
        query.data.teamId ? eq(pullRequestsTable.teamId, query.data.teamId) : undefined,
      ),
    );

    const [incidentStats] = await db.select({
      open: sql<number>`count(*) filter (where status = 'open')`,
      avgRecovery: avg(incidentsTable.recoveryTimeSeconds),
    }).from(incidentsTable).where(
      query.data.teamId ? eq(incidentsTable.teamId, query.data.teamId) : undefined,
    );

    const totalDeploys = Number(deployStats?.total ?? 0);
    const succeededDeploys = Number(deployStats?.succeeded ?? 0);
    const failedDeploys = Number(deployStats?.failed ?? 0);
    const successRate = totalDeploys > 0 ? succeededDeploys / totalDeploys : 0;
    const changeFailureRate = totalDeploys > 0 ? failedDeploys / totalDeploys : 0;
    const avgLeadTimeDays = deployStats?.avgLeadTime ? Number(deployStats.avgLeadTime) / 86400 : 0;
    const avgCycleTimeDays = prStats?.avgCycleTime ? Number(prStats.avgCycleTime) / 86400 : 0;
    const avgRecoveryHours = incidentStats?.avgRecovery ? Number(incidentStats.avgRecovery) / 3600 : 0;
    const deploysPerDay = periodDays > 0 ? totalDeploys / periodDays : 0;

    const dfRating = classifyDoraRating("df", deploysPerDay);
    const ltRating = classifyDoraRating("lt", avgLeadTimeDays * 24);
    const cfrRating = classifyDoraRating("cfr", changeFailureRate);
    const mttrRating = classifyDoraRating("mttr", avgRecoveryHours);
    const doraRating = overallDoraRating(dfRating, ltRating, cfrRating, mttrRating);

    res.json(GetMetricsSummaryResponse.parse({
      totalDeployments: totalDeploys,
      successRate: Math.round(successRate * 1000) / 1000,
      avgLeadTimeDays: Math.round(avgLeadTimeDays * 100) / 100,
      avgCycleTimeDays: Math.round(avgCycleTimeDays * 100) / 100,
      openIncidents: Number(incidentStats?.open ?? 0),
      totalPullRequests: Number(prStats?.total ?? 0),
      mergedPullRequests: Number(prStats?.merged ?? 0),
      doraRating,
      deploymentsPerDay: Math.round(deploysPerDay * 100) / 100,
      changeFailureRate: Math.round(changeFailureRate * 1000) / 1000,
      avgRecoveryTimeHours: Math.round(avgRecoveryHours * 100) / 100,
    }));
  });

  // ── /metrics/dora ────────────────────────────────────────────────────────

  router.get("/metrics/dora", async (req, res): Promise<void> => {
    const query = GetDoraMetricsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const period = (query.data.period ?? "30d") as Period;
    const periodStart = getPeriodStart(period);
    const periodDays = getPeriodDays(period);
    const prevStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const teamFilter = query.data.teamId;

    const deployFilter = and(
      gte(deploymentsTable.deployedAt, periodStart),
      teamFilter ? eq(deploymentsTable.teamId, teamFilter) : undefined,
    );
    const prevDeployFilter = and(
      gte(deploymentsTable.deployedAt, prevStart),
      lte(deploymentsTable.deployedAt, periodStart),
      teamFilter ? eq(deploymentsTable.teamId, teamFilter) : undefined,
    );

    const [curr] = await db.select({
      total: count(),
      failed: sql<number>`count(*) filter (where status = 'failed' or status = 'rolled_back')`,
      avgLeadTime: avg(deploymentsTable.leadTimeSeconds),
    }).from(deploymentsTable).where(deployFilter);

    const [prev] = await db.select({
      total: count(),
      failed: sql<number>`count(*) filter (where status = 'failed' or status = 'rolled_back')`,
      avgLeadTime: avg(deploymentsTable.leadTimeSeconds),
    }).from(deploymentsTable).where(prevDeployFilter);

    const incidentFilter = and(
      gte(incidentsTable.openedAt, periodStart),
      isNotNull(incidentsTable.recoveryTimeSeconds),
      teamFilter ? eq(incidentsTable.teamId, teamFilter) : undefined,
    );
    const [incStats] = await db.select({ avgRecovery: avg(incidentsTable.recoveryTimeSeconds) })
      .from(incidentsTable).where(incidentFilter);

    const prevIncidentFilter = and(
      gte(incidentsTable.openedAt, prevStart),
      lte(incidentsTable.openedAt, periodStart),
      isNotNull(incidentsTable.recoveryTimeSeconds),
      teamFilter ? eq(incidentsTable.teamId, teamFilter) : undefined,
    );
    const [prevIncStats] = await db.select({ avgRecovery: avg(incidentsTable.recoveryTimeSeconds) })
      .from(incidentsTable).where(prevIncidentFilter);

    const currTotal = Number(curr?.total ?? 0);
    const prevTotal = Number(prev?.total ?? 0);
    const currFailed = Number(curr?.failed ?? 0);
    const prevFailed = Number(prev?.failed ?? 0);

    const dfCurr = periodDays > 0 ? currTotal / periodDays : 0;
    const dfPrev = periodDays > 0 ? prevTotal / periodDays : 0;
    const dfTrend = dfPrev > 0 ? (dfCurr - dfPrev) / dfPrev : 0;

    const ltCurrHours = Number(curr?.avgLeadTime ?? 0) / 3600;
    const ltPrevHours = Number(prev?.avgLeadTime ?? 0) / 3600;
    const ltTrend = ltPrevHours > 0 ? (ltCurrHours - ltPrevHours) / ltPrevHours : 0;

    const cfrCurr = currTotal > 0 ? currFailed / currTotal : 0;
    const cfrPrev = prevTotal > 0 ? prevFailed / prevTotal : 0;
    const cfrTrend = cfrPrev > 0 ? (cfrCurr - cfrPrev) / cfrPrev : 0;

    const mttrCurrHours = Number(incStats?.avgRecovery ?? 0) / 3600;
    const mttrPrevHours = Number(prevIncStats?.avgRecovery ?? 0) / 3600;
    const mttrTrend = mttrPrevHours > 0 ? (mttrCurrHours - mttrPrevHours) / mttrPrevHours : 0;

    const trendDir = (t: number, lowerIsBetter: boolean) =>
      t > 0.02 ? (lowerIsBetter ? "down" : "up") : t < -0.02 ? (lowerIsBetter ? "up" : "down") : "flat";

    res.json(GetDoraMetricsResponse.parse({
      deploymentFrequency: {
        value: Math.round(dfCurr * 100) / 100,
        unit: "deploys/day",
        rating: classifyDoraRating("df", dfCurr),
        trend: Math.round(dfTrend * 1000) / 1000,
        trendDirection: trendDir(dfTrend, false),
      },
      leadTimeForChanges: {
        value: Math.round(ltCurrHours * 100) / 100,
        unit: "hours",
        rating: classifyDoraRating("lt", ltCurrHours),
        trend: Math.round(ltTrend * 1000) / 1000,
        trendDirection: trendDir(ltTrend, true),
      },
      changeFailureRate: {
        value: Math.round(cfrCurr * 1000) / 1000,
        unit: "ratio",
        rating: classifyDoraRating("cfr", cfrCurr),
        trend: Math.round(cfrTrend * 1000) / 1000,
        trendDirection: trendDir(cfrTrend, true),
      },
      meanTimeToRecovery: {
        value: Math.round(mttrCurrHours * 100) / 100,
        unit: "hours",
        rating: classifyDoraRating("mttr", mttrCurrHours),
        trend: Math.round(mttrTrend * 1000) / 1000,
        trendDirection: trendDir(mttrTrend, true),
      },
    }));
  });

  // ── /metrics/dora/timeseries ─────────────────────────────────────────────

  router.get("/metrics/dora/timeseries", async (req, res): Promise<void> => {
    const query = GetDoraTimeseriesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const periodStart = getPeriodStart((query.data.period ?? "30d") as Period);
    const metric = query.data.metric ?? "deployment_frequency";

    let rows: { date: string; value: number }[] = [];

    if (metric === "deployment_frequency") {
      const result = await db.execute(sql`
        SELECT to_char(date_trunc('day', deployed_at), 'YYYY-MM-DD') as date,
               count(*)::float as value
        FROM deployments WHERE deployed_at >= ${periodStart}
        GROUP BY 1 ORDER BY 1
      `);
      rows = (result.rows as Array<{ date: string; value: number }>).map(r => ({ date: r.date, value: Number(r.value) }));
    } else if (metric === "lead_time") {
      const result = await db.execute(sql`
        SELECT to_char(date_trunc('day', deployed_at), 'YYYY-MM-DD') as date,
               coalesce(avg(lead_time_seconds) / 3600.0, 0)::float as value
        FROM deployments WHERE deployed_at >= ${periodStart} AND lead_time_seconds IS NOT NULL
        GROUP BY 1 ORDER BY 1
      `);
      rows = (result.rows as Array<{ date: string; value: number }>).map(r => ({ date: r.date, value: Math.round(Number(r.value) * 100) / 100 }));
    } else if (metric === "change_failure_rate") {
      const result = await db.execute(sql`
        SELECT to_char(date_trunc('day', deployed_at), 'YYYY-MM-DD') as date,
               coalesce(count(*) filter (where status in ('failed','rolled_back'))::float / nullif(count(*), 0), 0) as value
        FROM deployments WHERE deployed_at >= ${periodStart}
        GROUP BY 1 ORDER BY 1
      `);
      rows = (result.rows as Array<{ date: string; value: number }>).map(r => ({ date: r.date, value: Math.round(Number(r.value) * 1000) / 1000 }));
    } else if (metric === "recovery_time") {
      const result = await db.execute(sql`
        SELECT to_char(date_trunc('day', opened_at), 'YYYY-MM-DD') as date,
               coalesce(avg(recovery_time_seconds) / 3600.0, 0)::float as value
        FROM incidents WHERE opened_at >= ${periodStart} AND recovery_time_seconds IS NOT NULL
        GROUP BY 1 ORDER BY 1
      `);
      rows = (result.rows as Array<{ date: string; value: number }>).map(r => ({ date: r.date, value: Math.round(Number(r.value) * 100) / 100 }));
    }

    res.json(GetDoraTimeseriesResponse.parse(rows.map(r => ({ date: r.date, value: r.value, label: null }))));
  });

  // ── /metrics/flow ────────────────────────────────────────────────────────

  router.get("/metrics/flow", async (req, res): Promise<void> => {
    const query = GetFlowMetricsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const period = (query.data.period ?? "30d") as Period;
    const periodStart = getPeriodStart(period);
    const periodDays = getPeriodDays(period);
    const teamFilter = query.data.teamId ? eq(pullRequestsTable.teamId, query.data.teamId) : undefined;

    const [prStats] = await db.select({
      total: count(),
      merged: sql<number>`count(*) filter (where state = 'merged')`,
      open: sql<number>`count(*) filter (where state = 'open')`,
      avgCycleTime: avg(pullRequestsTable.cycleTimeSeconds),
      avgAdditions: avg(pullRequestsTable.additions),
      avgDeletions: avg(pullRequestsTable.deletions),
    }).from(pullRequestsTable).where(and(gte(pullRequestsTable.openedAt, periodStart), teamFilter));

    const medianResult = await db.execute(sql`
      SELECT percentile_cont(0.5) within group (order by cycle_time_seconds)::float as median
      FROM pull_requests WHERE opened_at >= ${periodStart} AND cycle_time_seconds IS NOT NULL
    `);

    const merged = Number(prStats?.merged ?? 0);
    const open = Number(prStats?.open ?? 0);
    const total = Number(prStats?.total ?? 0);
    const avgCycleSec = Number(prStats?.avgCycleTime ?? 0);
    const medianCycleSec = Number((medianResult.rows[0] as { median: number })?.median ?? 0);
    const throughputPerWeek = periodDays > 0 ? (merged / periodDays) * 7 : 0;
    const prMergeRate = total > 0 ? merged / total : 0;
    const avgAdditions = Number(prStats?.avgAdditions ?? 0);
    const avgDeletions = Number(prStats?.avgDeletions ?? 0);

    res.json(GetFlowMetricsResponse.parse({
      avgCycleTimeDays: Math.round((avgCycleSec / 86400) * 100) / 100,
      medianCycleTimeDays: Math.round((medianCycleSec / 86400) * 100) / 100,
      throughputPerWeek: Math.round(throughputPerWeek * 10) / 10,
      wipCount: open,
      prMergeRate: Math.round(prMergeRate * 1000) / 1000,
      avgPrSize: Math.round(avgAdditions + avgDeletions),
      reviewTurnaroundHours: 0,
    }));
  });

  // ── /metrics/team-health ─────────────────────────────────────────────────

  router.get("/metrics/team-health", async (req, res): Promise<void> => {
    const query = GetTeamHealthMetricsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const period = (query.data.period ?? "30d") as Period;
    const periodStart = getPeriodStart(period);
    const periodDays = getPeriodDays(period);

    const [teams, deployGroups, prGroups, incidentGroups] = await Promise.all([
      db.select().from(teamsTable).orderBy(teamsTable.name),
      db.select({
        teamId: deploymentsTable.teamId,
        total: count(),
        failed: sql<number>`count(*) filter (where status in ('failed','rolled_back'))`,
      }).from(deploymentsTable)
        .where(gte(deploymentsTable.deployedAt, periodStart))
        .groupBy(deploymentsTable.teamId),
      db.select({
        teamId: pullRequestsTable.teamId,
        total: count(),
        avgCycleTime: avg(pullRequestsTable.cycleTimeSeconds),
      }).from(pullRequestsTable)
        .where(gte(pullRequestsTable.openedAt, periodStart))
        .groupBy(pullRequestsTable.teamId),
      db.select({
        teamId: incidentsTable.teamId,
        total: count(),
      }).from(incidentsTable)
        .where(gte(incidentsTable.openedAt, periodStart))
        .groupBy(incidentsTable.teamId),
    ]);

    const deployMap = new Map(deployGroups.map(r => [r.teamId, r]));
    const prMap = new Map(prGroups.map(r => [r.teamId, r]));
    const incidentMap = new Map(incidentGroups.map(r => [r.teamId, r]));

    const results = teams.map((team) => {
      const deployStats = deployMap.get(team.id);
      const prStats = prMap.get(team.id);
      const incidentStats = incidentMap.get(team.id);

      const deploys = Number(deployStats?.total ?? 0);
      const failed = Number(deployStats?.failed ?? 0);
      const cfr = deploys > 0 ? failed / deploys : 0;
      const avgCycleTimeDays = prStats?.avgCycleTime ? Number(prStats.avgCycleTime) / 86400 : 0;
      const dfPerDay = periodDays > 0 ? deploys / periodDays : 0;

      const dfR = classifyDoraRating("df", dfPerDay);
      const ltR = classifyDoraRating("lt", avgCycleTimeDays * 24);
      const cfrR = classifyDoraRating("cfr", cfr);
      const healthScore = computeHealthScore(dfR, ltR, cfrR);
      const doraRating = overallDoraRating(dfR, ltR, cfrR, "high" as DoraRating);

      return {
        teamId: team.id,
        teamName: team.name,
        healthScore,
        deploymentCount: deploys,
        prCount: Number(prStats?.total ?? 0),
        incidentCount: Number(incidentStats?.total ?? 0),
        avgCycleTimeDays: Math.round(avgCycleTimeDays * 100) / 100,
        doraRating,
      };
    });

    res.json(GetTeamHealthMetricsResponse.parse(results));
  });

  // ── /metrics/activity ────────────────────────────────────────────────────

  router.get("/metrics/activity", async (req, res): Promise<void> => {
    const query = GetActivityFeedQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const limit = Math.floor((query.data.limit ?? 20) / 3);
    const teamFilter = query.data.teamId;

    const [deployments, prs, incidents] = await Promise.all([
      db.select({
        id: deploymentsTable.id,
        status: deploymentsTable.status,
        environment: deploymentsTable.environment,
        commitSha: deploymentsTable.commitSha,
        teamId: deploymentsTable.teamId,
        repositoryId: deploymentsTable.repositoryId,
        deployedAt: deploymentsTable.deployedAt,
      }).from(deploymentsTable)
        .where(teamFilter ? eq(deploymentsTable.teamId, teamFilter) : undefined)
        .orderBy(desc(deploymentsTable.deployedAt)).limit(limit),

      db.select({
        id: pullRequestsTable.id,
        title: pullRequestsTable.title,
        state: pullRequestsTable.state,
        authorLogin: pullRequestsTable.authorLogin,
        teamId: pullRequestsTable.teamId,
        repositoryId: pullRequestsTable.repositoryId,
        openedAt: pullRequestsTable.openedAt,
        mergedAt: pullRequestsTable.mergedAt,
      }).from(pullRequestsTable)
        .where(teamFilter ? eq(pullRequestsTable.teamId, teamFilter) : undefined)
        .orderBy(desc(pullRequestsTable.openedAt)).limit(limit),

      db.select({
        id: incidentsTable.id,
        title: incidentsTable.title,
        severity: incidentsTable.severity,
        status: incidentsTable.status,
        teamId: incidentsTable.teamId,
        openedAt: incidentsTable.openedAt,
      }).from(incidentsTable)
        .where(teamFilter ? eq(incidentsTable.teamId, teamFilter) : undefined)
        .orderBy(desc(incidentsTable.openedAt)).limit(limit),
    ]);

    const teamIds = [...new Set([
      ...deployments.map(d => d.teamId),
      ...prs.map(p => p.teamId),
      ...incidents.map(i => i.teamId),
    ].filter(Boolean))] as number[];

    const repoIds = [...new Set([
      ...deployments.map(d => d.repositoryId),
      ...prs.map(p => p.repositoryId),
    ].filter(Boolean))] as number[];

    const [teamsData, reposData] = await Promise.all([
      teamIds.length > 0
        ? db.select({ id: teamsTable.id, name: teamsTable.name }).from(teamsTable).where(inArray(teamsTable.id, teamIds))
        : Promise.resolve([]),
      repoIds.length > 0
        ? db.select({ id: repositoriesTable.id, name: repositoriesTable.name }).from(repositoriesTable).where(inArray(repositoriesTable.id, repoIds))
        : Promise.resolve([]),
    ]);

    const teamMap = new Map(teamsData.map(t => [t.id, t.name]));
    const repoMap = new Map(reposData.map(r => [r.id, r.name]));

    const items = [
      ...deployments.map(d => ({
        id: `deployment-${d.id}`,
        type: "deployment" as const,
        description: `Deployed to ${d.environment}${d.commitSha ? ` (${d.commitSha.slice(0, 7)})` : ""}`,
        teamName: d.teamId ? (teamMap.get(d.teamId) ?? null) : null,
        repositoryName: d.repositoryId ? (repoMap.get(d.repositoryId) ?? null) : null,
        actorLogin: null, status: d.status, severity: null, timestamp: d.deployedAt,
      })),
      ...prs.map(p => ({
        id: `pr-${p.id}`,
        type: "pull_request" as const,
        description: p.title,
        teamName: p.teamId ? (teamMap.get(p.teamId) ?? null) : null,
        repositoryName: p.repositoryId ? (repoMap.get(p.repositoryId) ?? null) : null,
        actorLogin: p.authorLogin ?? null, status: p.state, severity: null,
        timestamp: p.mergedAt ?? p.openedAt,
      })),
      ...incidents.map(i => ({
        id: `incident-${i.id}`,
        type: "incident" as const,
        description: i.title,
        teamName: i.teamId ? (teamMap.get(i.teamId) ?? null) : null,
        repositoryName: null, actorLogin: null, status: i.status, severity: i.severity,
        timestamp: i.openedAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, query.data.limit ?? 20);

    res.json(GetActivityFeedResponse.parse(items));
  });

  // ── /metrics/leaderboard ─────────────────────────────────────────────────

  router.get("/metrics/leaderboard", async (req, res): Promise<void> => {
    const query = GetTeamLeaderboardQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const period = (query.data.period ?? "30d") as Period;
    const periodStart = getPeriodStart(period);
    const periodDays = getPeriodDays(period);

    const [teams, deployGroups, incidentGroups] = await Promise.all([
      db.select().from(teamsTable).orderBy(teamsTable.name),
      db.select({
        teamId: deploymentsTable.teamId,
        total: count(),
        failed: sql<number>`count(*) filter (where status in ('failed','rolled_back'))`,
        avgLeadTime: avg(deploymentsTable.leadTimeSeconds),
      }).from(deploymentsTable)
        .where(gte(deploymentsTable.deployedAt, periodStart))
        .groupBy(deploymentsTable.teamId),
      db.select({
        teamId: incidentsTable.teamId,
        avgRecovery: avg(incidentsTable.recoveryTimeSeconds),
      }).from(incidentsTable)
        .where(and(gte(incidentsTable.openedAt, periodStart), isNotNull(incidentsTable.recoveryTimeSeconds)))
        .groupBy(incidentsTable.teamId),
    ]);

    const deployMap = new Map(deployGroups.map(r => [r.teamId, r]));
    const incidentMap = new Map(incidentGroups.map(r => [r.teamId, r]));

    const entries = teams.map((team) => {
      const deployStats = deployMap.get(team.id);
      const incStats = incidentMap.get(team.id);

      const deploys = Number(deployStats?.total ?? 0);
      const failed = Number(deployStats?.failed ?? 0);
      const cfr = deploys > 0 ? failed / deploys : 0;
      const dfPerDay = periodDays > 0 ? deploys / periodDays : 0;
      const ltHours = deployStats?.avgLeadTime ? Number(deployStats.avgLeadTime) / 3600 : 0;
      const mttrHours = incStats?.avgRecovery ? Number(incStats.avgRecovery) / 3600 : 0;

      const dfR = classifyDoraRating("df", dfPerDay);
      const ltR = classifyDoraRating("lt", ltHours);
      const cfrR = classifyDoraRating("cfr", cfr);
      const mttrR = classifyDoraRating("mttr", mttrHours);
      const doraRating = overallDoraRating(dfR, ltR, cfrR, mttrR);
      const score = computeLeaderboardScore(dfR, ltR, cfrR, mttrR);

      return {
        rank: 0, teamId: team.id, teamName: team.name, score,
        deploymentFrequency: Math.round(dfPerDay * 100) / 100,
        leadTimeDays: Math.round((ltHours / 24) * 100) / 100,
        changeFailureRate: Math.round(cfr * 1000) / 1000,
        recoveryTimeHours: Math.round(mttrHours * 100) / 100,
        doraRating,
      };
    });

    const ranked = entries
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    res.json(GetTeamLeaderboardResponse.parse(ranked));
  });

  return router;
}
