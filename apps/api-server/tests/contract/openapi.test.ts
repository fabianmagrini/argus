/**
 * Contract tests: every endpoint's response body must parse against
 * the corresponding Zod schema from @argus/api-zod (generated from
 * lib/api-spec/openapi.yaml). A parse failure means the API has
 * drifted from the OpenAPI contract.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  HealthCheckResponse,
  ListTeamsResponse,
  GetTeamResponse,
  GetMetricsSummaryResponse,
  GetDoraMetricsResponse,
  GetDoraTimeseriesResponse,
  GetFlowMetricsResponse,
  GetTeamHealthMetricsResponse,
  GetActivityFeedResponse,
  GetTeamLeaderboardResponse,
} from "@argus/api-zod";
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

const team = {
  id: 1,
  name: "Platform",
  description: "Core platform team",
  timezone: "UTC",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-06-01T00:00:00Z"),
};

const summaryDb = () =>
  createMockDb({
    selectResults: [
      [{ total: 10, succeeded: 8, failed: 2, avgLeadTime: 3600 }],
      [{ total: 5, merged: 4, avgCycleTime: 7200 }],
      [{ open: 1, avgRecovery: 1800 }],
    ],
  });

const doraDb = () =>
  createMockDb({
    selectResults: [
      [{ total: 30, failed: 3, avgLeadTime: 3600 }],
      [{ total: 30, failed: 2, avgLeadTime: 7200 }],
      [{ avgRecovery: 1800 }],
      [{ avgRecovery: 3600 }],
    ],
  });

const flowDb = () =>
  createMockDb({
    selectResults: [
      [{ total: 20, merged: 15, open: 5, avgCycleTime: 86400, avgAdditions: 200, avgDeletions: 50 }],
    ],
    executeRows: [{ median: 72000 }],
  });

describe("OpenAPI contract: response shapes match generated Zod schemas", () => {
  it("GET /api/healthz → HealthCheckResponse", async () => {
    const app = createApp();
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(() => HealthCheckResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/teams → ListTeamsResponse", async () => {
    const db = createMockDb({ selectFallback: [team] });
    const app = createApp(db);
    const res = await request(app).get("/api/teams");
    expect(res.status).toBe(200);
    expect(() => ListTeamsResponse.parse(res.body)).not.toThrow();
  });

  it("POST /api/teams → GetTeamResponse", async () => {
    const db = createMockDb({ insertResult: [team] });
    const app = createApp(db);
    const res = await request(app).post("/api/teams").send({ name: "Platform" });
    expect(res.status).toBe(201);
    expect(() => GetTeamResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/teams/:id → GetTeamResponse", async () => {
    const db = createMockDb({ selectFallback: [team] });
    const app = createApp(db);
    const res = await request(app).get("/api/teams/1");
    expect(res.status).toBe(200);
    expect(() => GetTeamResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/metrics/summary → GetMetricsSummaryResponse", async () => {
    const app = createApp(summaryDb());
    const res = await request(app).get("/api/metrics/summary");
    expect(res.status).toBe(200);
    expect(() => GetMetricsSummaryResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/metrics/dora → GetDoraMetricsResponse", async () => {
    const app = createApp(doraDb());
    const res = await request(app).get("/api/metrics/dora");
    expect(res.status).toBe(200);
    expect(() => GetDoraMetricsResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/metrics/dora/timeseries → GetDoraTimeseriesResponse", async () => {
    const db = createMockDb({ executeRows: [{ date: "2024-01-01", value: 3 }] });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/dora/timeseries?metric=deployment_frequency");
    expect(res.status).toBe(200);
    expect(() => GetDoraTimeseriesResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/metrics/flow → GetFlowMetricsResponse", async () => {
    const app = createApp(flowDb());
    const res = await request(app).get("/api/metrics/flow");
    expect(res.status).toBe(200);
    expect(() => GetFlowMetricsResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/metrics/team-health → GetTeamHealthMetricsResponse", async () => {
    const db = createMockDb({ selectFallback: [] });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/team-health");
    expect(res.status).toBe(200);
    expect(() => GetTeamHealthMetricsResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/metrics/activity → GetActivityFeedResponse", async () => {
    const db = createMockDb({ selectFallback: [] });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/activity");
    expect(res.status).toBe(200);
    expect(() => GetActivityFeedResponse.parse(res.body)).not.toThrow();
  });

  it("GET /api/metrics/leaderboard → GetTeamLeaderboardResponse", async () => {
    const db = createMockDb({ selectFallback: [] });
    const app = createApp(db);
    const res = await request(app).get("/api/metrics/leaderboard");
    expect(res.status).toBe(200);
    expect(() => GetTeamLeaderboardResponse.parse(res.body)).not.toThrow();
  });
});
