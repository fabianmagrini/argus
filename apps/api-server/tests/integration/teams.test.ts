import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

const baseTeam = {
  id: 1,
  name: "Platform",
  description: "Platform engineering",
  timezone: "UTC",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("GET /api/teams", () => {
  it("returns an empty array when no teams exist", async () => {
    const db = createMockDb({ selectFallback: [] });
    const app = createApp(db);
    const res = await request(app).get("/api/teams");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns serialised team list", async () => {
    const db = createMockDb({ selectFallback: [baseTeam] });
    const app = createApp(db);
    const res = await request(app).get("/api/teams");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, name: "Platform" });
  });
});

describe("POST /api/teams", () => {
  it("returns 201 with the created team", async () => {
    const db = createMockDb({ insertResult: [baseTeam] });
    const app = createApp(db);
    const res = await request(app)
      .post("/api/teams")
      .send({ name: "Platform" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, name: "Platform" });
  });

  it("returns 400 when name is missing", async () => {
    const db = createMockDb();
    const app = createApp(db);
    const res = await request(app).post("/api/teams").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when name is empty string", async () => {
    const db = createMockDb();
    const app = createApp(db);
    const res = await request(app).post("/api/teams").send({ name: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/teams/:id", () => {
  it("returns 200 with the team", async () => {
    const db = createMockDb({ selectFallback: [baseTeam] });
    const app = createApp(db);
    const res = await request(app).get("/api/teams/1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, name: "Platform" });
  });

  it("returns 404 when team does not exist", async () => {
    const db = createMockDb({ selectFallback: [] });
    const app = createApp(db);
    const res = await request(app).get("/api/teams/999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for a non-numeric id", async () => {
    const db = createMockDb();
    const app = createApp(db);
    const res = await request(app).get("/api/teams/not-a-number");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/teams/:id", () => {
  it("returns 200 with the updated team", async () => {
    const updated = { ...baseTeam, name: "Updated" };
    const db = createMockDb({ updateResult: [updated] });
    const app = createApp(db);
    const res = await request(app)
      .patch("/api/teams/1")
      .send({ name: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Updated" });
  });

  it("returns 404 when team does not exist", async () => {
    const db = createMockDb({ updateResult: [] });
    const app = createApp(db);
    const res = await request(app)
      .patch("/api/teams/999")
      .send({ name: "Renamed" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/teams/:id", () => {
  it("returns 204 on successful deletion", async () => {
    const db = createMockDb({ deleteResult: [baseTeam] });
    const app = createApp(db);
    const res = await request(app).delete("/api/teams/1");
    expect(res.status).toBe(204);
  });

  it("returns 404 when team does not exist", async () => {
    const db = createMockDb({ deleteResult: [] });
    const app = createApp(db);
    const res = await request(app).delete("/api/teams/999");
    expect(res.status).toBe(404);
  });
});
