import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

const baseIncident = {
  id: 1,
  teamId: 1,
  title: "API outage in production",
  severity: "p1",
  status: "open",
  recoveryTimeSeconds: null,
  openedAt: new Date("2024-06-01T08:00:00Z"),
  resolvedAt: null,
  createdAt: new Date("2024-06-01T08:00:00Z"),
  updatedAt: new Date("2024-06-01T08:00:00Z"),
};

describe("GET /api/incidents", () => {
  it("returns an empty array when no incidents exist", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/incidents");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns a list of incidents", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseIncident] }));
    const res = await request(app).get("/api/incidents");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, title: "API outage in production", severity: "p1" });
  });

  it("accepts severity filter", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/incidents?severity=p1");
    expect(res.status).toBe(200);
  });

  it("accepts status filter", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/incidents?status=open");
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid severity", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/incidents?severity=critical");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid status", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/incidents?status=closed");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/incidents", () => {
  it("returns 201 with the created incident", async () => {
    const app = createApp(createMockDb({ insertResult: [baseIncident] }));
    const res = await request(app).post("/api/incidents").send({
      title: "API outage in production",
      severity: "p1",
      status: "open",
      openedAt: "2024-06-01T08:00:00Z",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, severity: "p1", status: "open" });
  });

  it("returns 400 when title is missing", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/incidents").send({
      severity: "p2",
      status: "open",
      openedAt: "2024-06-01T08:00:00Z",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid severity value", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/incidents").send({
      title: "Outage",
      severity: "critical",
      status: "open",
      openedAt: "2024-06-01T08:00:00Z",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/incidents/:id", () => {
  it("returns the incident", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseIncident] }));
    const res = await request(app).get("/api/incidents/1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, severity: "p1" });
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/incidents/999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for non-numeric id", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/incidents/xyz");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/incidents/:id", () => {
  it("returns 200 with the resolved incident", async () => {
    // resolvedAt uses zod.string().nullish() — must be ISO string, not Date.
    const resolved = {
      ...baseIncident,
      status: "resolved",
      recoveryTimeSeconds: 3600,
      resolvedAt: "2024-06-01T09:00:00.000Z",
    };
    const app = createApp(createMockDb({ updateResult: [resolved] }));
    const res = await request(app).patch("/api/incidents/1").send({
      status: "resolved",
      recoveryTimeSeconds: 3600,
      resolvedAt: "2024-06-01T09:00:00Z",
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "resolved", recoveryTimeSeconds: 3600 });
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ updateResult: [] }));
    const res = await request(app).patch("/api/incidents/999").send({ status: "resolved" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).patch("/api/incidents/1").send({ status: "pending" });
    expect(res.status).toBe(400);
  });
});
