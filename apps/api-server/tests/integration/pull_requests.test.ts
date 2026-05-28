import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

const basePr = {
  id: 1,
  repositoryId: 1,
  teamId: 1,
  externalId: 42,
  title: "feat: add new feature",
  authorLogin: "alice",
  state: "open",
  additions: 120,
  deletions: 30,
  changedFiles: 5,
  cycleTimeSeconds: null,
  // openedAt uses zod.coerce.date() — Date works.
  // mergedAt/closedAt use zod.string().nullish() — must be string or null.
  openedAt: new Date("2024-06-01T09:00:00Z"),
  mergedAt: null,
  closedAt: null,
  createdAt: new Date("2024-06-01T09:00:00Z"),
  updatedAt: new Date("2024-06-01T09:00:00Z"),
};

describe("GET /api/pull-requests", () => {
  it("returns an empty array when no PRs exist", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/pull-requests");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns a list of pull requests", async () => {
    const app = createApp(createMockDb({ selectFallback: [basePr] }));
    const res = await request(app).get("/api/pull-requests");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, title: "feat: add new feature", state: "open" });
  });

  it("accepts state filter", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/pull-requests?state=merged");
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid state", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/pull-requests?state=invalid");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("accepts teamId and repositoryId filters", async () => {
    const app = createApp(createMockDb({ selectFallback: [basePr] }));
    const res = await request(app).get("/api/pull-requests?teamId=1&repositoryId=1");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/pull-requests", () => {
  it("returns 201 with the created PR", async () => {
    const app = createApp(createMockDb({ insertResult: [basePr] }));
    const res = await request(app).post("/api/pull-requests").send({
      repositoryId: 1,
      title: "feat: add new feature",
      state: "open",
      openedAt: "2024-06-01T09:00:00Z",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, title: "feat: add new feature" });
  });

  it("returns 400 when title is missing", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/pull-requests").send({
      repositoryId: 1,
      state: "open",
      openedAt: "2024-06-01T09:00:00Z",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid state value", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/pull-requests").send({
      repositoryId: 1,
      title: "feat: thing",
      state: "draft",
      openedAt: "2024-06-01T09:00:00Z",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/pull-requests/:id", () => {
  it("returns the PR", async () => {
    const app = createApp(createMockDb({ selectFallback: [basePr] }));
    const res = await request(app).get("/api/pull-requests/1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, state: "open" });
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/pull-requests/999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for non-numeric id", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/pull-requests/abc");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/pull-requests/:id", () => {
  it("returns 200 with the updated PR", async () => {
    const merged = { ...basePr, state: "merged", mergedAt: "2024-06-02T10:00:00.000Z", cycleTimeSeconds: 90000 };
    const app = createApp(createMockDb({ updateResult: [merged] }));
    const res = await request(app).patch("/api/pull-requests/1").send({
      state: "merged",
      mergedAt: "2024-06-02T10:00:00Z",
      cycleTimeSeconds: 90000,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ state: "merged" });
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ updateResult: [] }));
    const res = await request(app).patch("/api/pull-requests/999").send({ state: "closed" });
    expect(res.status).toBe(404);
  });
});
