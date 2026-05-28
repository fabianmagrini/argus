import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

const baseEvent = {
  id: 1,
  teamId: 1,
  repositoryId: 1,
  type: "github.push",
  actorLogin: "alice",
  metadata: { ref: "refs/heads/main", sha: "abc1234" },
  occurredAt: new Date("2024-06-01T12:00:00Z"),
  createdAt: new Date("2024-06-01T12:00:00Z"),
};

describe("POST /api/events", () => {
  it("returns 202 with the ingested event", async () => {
    const app = createApp(createMockDb({ insertResult: [baseEvent] }));
    const res = await request(app).post("/api/events").send({ type: "github.push" });
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ id: 1, type: "github.push" });
  });

  it("returns 400 when type is missing", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/events").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when type is empty string", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/events").send({ type: "" });
    expect(res.status).toBe(400);
  });

  it("accepts optional fields", async () => {
    const app = createApp(createMockDb({ insertResult: [baseEvent] }));
    const res = await request(app).post("/api/events").send({
      type: "github.push",
      teamId: 1,
      repositoryId: 1,
      actorLogin: "alice",
      metadata: { ref: "refs/heads/main" },
      occurredAt: "2024-06-01T12:00:00Z",
    });
    expect(res.status).toBe(202);
  });
});

describe("GET /api/events", () => {
  it("returns an empty array when no events exist", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns a list of events", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseEvent] }));
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, type: "github.push", actorLogin: "alice" });
  });

  it("accepts teamId filter", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseEvent] }));
    const res = await request(app).get("/api/events?teamId=1");
    expect(res.status).toBe(200);
  });

  it("accepts type filter", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseEvent] }));
    const res = await request(app).get("/api/events?type=github.push");
    expect(res.status).toBe(200);
  });

  it("accepts limit param", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/events?limit=10");
    expect(res.status).toBe(200);
  });
});
