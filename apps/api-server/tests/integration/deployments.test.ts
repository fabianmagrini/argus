import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

const baseDeployment = {
  id: 1,
  repositoryId: 1,
  teamId: 1,
  environment: "production",
  status: "success",
  commitSha: "abc1234",
  version: "1.0.0",
  leadTimeSeconds: 3600,
  // deployedAt uses zod.coerce.date() — Date or ISO string both work.
  // finishedAt uses zod.string().nullish() — must be a string, not a Date.
  deployedAt: new Date("2024-06-01T10:00:00Z"),
  finishedAt: "2024-06-01T10:05:00.000Z",
  createdAt: new Date("2024-06-01T10:00:00Z"),
  updatedAt: new Date("2024-06-01T10:05:00Z"),
};

describe("GET /api/deployments", () => {
  it("returns an empty array when no deployments exist", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/deployments");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns a list of deployments", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseDeployment] }));
    const res = await request(app).get("/api/deployments");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, environment: "production", status: "success" });
  });

  it("accepts teamId query param", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseDeployment] }));
    const res = await request(app).get("/api/deployments?teamId=1");
    expect(res.status).toBe(200);
  });

  it("accepts status filter", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/deployments?status=failed");
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid status", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/deployments?status=invalid");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("POST /api/deployments", () => {
  it("returns 201 with the created deployment", async () => {
    const app = createApp(createMockDb({ insertResult: [baseDeployment] }));
    const res = await request(app).post("/api/deployments").send({
      repositoryId: 1,
      environment: "production",
      status: "success",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, environment: "production" });
  });

  it("returns 400 when repositoryId is missing", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/deployments").send({
      environment: "production",
      status: "success",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when status is invalid", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/deployments").send({
      repositoryId: 1,
      environment: "production",
      status: "broken",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/deployments/:id", () => {
  it("returns the deployment", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseDeployment] }));
    const res = await request(app).get("/api/deployments/1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, status: "success" });
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/deployments/999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for non-numeric id", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/deployments/not-a-number");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/deployments/:id", () => {
  it("returns 200 with the updated deployment", async () => {
    const updated = { ...baseDeployment, status: "failed", finishedAt: "2024-06-01T10:10:00.000Z" };
    const app = createApp(createMockDb({ updateResult: [updated] }));
    const res = await request(app).patch("/api/deployments/1").send({ status: "failed" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "failed" });
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ updateResult: [] }));
    const res = await request(app).patch("/api/deployments/999").send({ status: "success" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status value", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).patch("/api/deployments/1").send({ status: "unknown" });
    expect(res.status).toBe(400);
  });
});
