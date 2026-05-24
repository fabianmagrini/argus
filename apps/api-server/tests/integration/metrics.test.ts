import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

/**
 * Metrics endpoints aggregate data from multiple tables. Each db.select()
 * call in metrics.ts returns aggregated counts/averages — we stub those
 * with the shapes the route code expects.
 */

const emptySummaryDb = () =>
  createMockDb({
    selectResults: [
      [{ total: 0, succeeded: 0, failed: 0, avgLeadTime: null }],
      [{ total: 0, merged: 0, avgCycleTime: null }],
      [{ open: 0, avgRecovery: null }],
    ],
  });

describe("GET /api/metrics/summary", () => {
  it("returns 200 with zero values when no data", async () => {
    const app = createApp(emptySummaryDb());
    const res = await request(app).get("/api/metrics/summary");
    expect(res.status).toBe(200);
    const b = res.body;
    expect(b).toHaveProperty("totalDeployments", 0);
    expect(b).toHaveProperty("successRate", 0);
    expect(b).toHaveProperty("doraRating");
    expect(b).toHaveProperty("deploymentsPerDay");
    expect(b).toHaveProperty("changeFailureRate");
  });

  it("computes success rate from deploy stats", async () => {
    const db = createMockDb({
      selectResults: [
        [{ total: 10, succeeded: 8, failed: 2, avgLeadTime: 3600 }],
        [{ total: 5, merged: 4, avgCycleTime: 7200 }],
        [{ open: 1, avgRecovery: 1800 }],
      ],
    });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/summary");
    expect(res.status).toBe(200);
    expect(res.body.totalDeployments).toBe(10);
    expect(res.body.successRate).toBeCloseTo(0.8, 2);
    expect(res.body.changeFailureRate).toBeCloseTo(0.2, 2);
  });

  it("accepts period query param", async () => {
    const app = createApp(emptySummaryDb());
    const res = await request(app).get("/api/metrics/summary?period=7d");
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid period", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/metrics/summary?period=invalid");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/metrics/dora", () => {
  const doraDb = () =>
    createMockDb({
      selectResults: [
        [{ total: 30, failed: 3, avgLeadTime: 3600 }],
        [{ total: 30, failed: 2, avgLeadTime: 7200 }],
        [{ avgRecovery: 1800 }],
        [{ avgRecovery: 3600 }],
      ],
    });

  it("returns 200 with four DORA metrics", async () => {
    const app = createApp(doraDb());
    const res = await request(app).get("/api/metrics/dora");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("deploymentFrequency");
    expect(res.body).toHaveProperty("leadTimeForChanges");
    expect(res.body).toHaveProperty("changeFailureRate");
    expect(res.body).toHaveProperty("meanTimeToRecovery");
  });

  it("each metric has value, unit, rating, trend, trendDirection", async () => {
    const app = createApp(doraDb());
    const res = await request(app).get("/api/metrics/dora");
    const df = res.body.deploymentFrequency;
    expect(df).toHaveProperty("value");
    expect(df).toHaveProperty("unit", "deploys/day");
    expect(df).toHaveProperty("rating");
    expect(df).toHaveProperty("trend");
    expect(df).toHaveProperty("trendDirection");
    expect(["up", "down", "flat"]).toContain(df.trendDirection);
  });

  it("returns 400 for invalid period", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/metrics/dora?period=bad");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/metrics/flow", () => {
  const flowDb = () =>
    createMockDb({
      selectResults: [
        [{ total: 20, merged: 15, open: 5, avgCycleTime: 86400, avgAdditions: 200, avgDeletions: 50 }],
      ],
      executeRows: [{ median: 72000 }],
    });

  it("returns 200 with flow metrics", async () => {
    const app = createApp(flowDb());
    const res = await request(app).get("/api/metrics/flow");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("avgCycleTimeDays");
    expect(res.body).toHaveProperty("medianCycleTimeDays");
    expect(res.body).toHaveProperty("throughputPerWeek");
    expect(res.body).toHaveProperty("wipCount");
    expect(res.body).toHaveProperty("prMergeRate");
    expect(res.body).toHaveProperty("avgPrSize");
  });

  it("computes throughputPerWeek from merged PRs", async () => {
    const app = createApp(flowDb());
    const res = await request(app).get("/api/metrics/flow?period=30d");
    expect(res.status).toBe(200);
    expect(res.body.throughputPerWeek).toBeCloseTo((15 / 30) * 7, 1);
  });
});

describe("GET /api/metrics/team-health", () => {
  it("returns empty array when no teams", async () => {
    const db = createMockDb({ selectFallback: [] });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/team-health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns health entry per team", async () => {
    const team = { id: 1, name: "Alpha", description: null, timezone: "UTC", createdAt: new Date() };
    const db = createMockDb({
      selectResults: [
        [team],
        [{ total: 20, failed: 1 }],
        [{ total: 10, avgCycleTime: 3600 }],
        [{ total: 0 }],
      ],
    });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/team-health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      teamId: 1,
      teamName: "Alpha",
    });
    expect(res.body[0]).toHaveProperty("healthScore");
    expect(res.body[0]).toHaveProperty("doraRating");
  });
});

describe("GET /api/metrics/activity", () => {
  it("returns empty array when no data", async () => {
    const db = createMockDb({ selectFallback: [] });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/activity");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/metrics/leaderboard", () => {
  it("returns empty leaderboard when no teams", async () => {
    const db = createMockDb({ selectFallback: [] });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
