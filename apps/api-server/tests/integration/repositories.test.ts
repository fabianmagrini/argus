import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

const baseRepo = {
  id: 1,
  teamId: 1,
  name: "api-server",
  fullName: "acme/api-server",
  url: "https://github.com/acme/api-server",
  defaultBranch: "main",
  language: "TypeScript",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("GET /api/repositories", () => {
  it("returns an empty array when no repos exist", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/repositories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns a list of repositories", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseRepo] }));
    const res = await request(app).get("/api/repositories");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, name: "api-server", fullName: "acme/api-server" });
  });

  it("accepts teamId filter", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseRepo] }));
    const res = await request(app).get("/api/repositories?teamId=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe("POST /api/repositories", () => {
  it("returns 201 with the created repository", async () => {
    const app = createApp(createMockDb({ insertResult: [baseRepo] }));
    const res = await request(app).post("/api/repositories").send({
      name: "api-server",
      fullName: "acme/api-server",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, name: "api-server", fullName: "acme/api-server" });
  });

  it("returns 400 when name is missing", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/repositories").send({ fullName: "acme/api-server" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when fullName is missing", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).post("/api/repositories").send({ name: "api-server" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/repositories/:id", () => {
  it("returns the repository", async () => {
    const app = createApp(createMockDb({ selectFallback: [baseRepo] }));
    const res = await request(app).get("/api/repositories/1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, fullName: "acme/api-server" });
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ selectFallback: [] }));
    const res = await request(app).get("/api/repositories/999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for non-numeric id", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).get("/api/repositories/not-a-number");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/repositories/:id", () => {
  it("returns 200 with the updated repository", async () => {
    const updated = { ...baseRepo, language: "Go" };
    const app = createApp(createMockDb({ updateResult: [updated] }));
    const res = await request(app).patch("/api/repositories/1").send({ language: "Go" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ language: "Go" });
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ updateResult: [] }));
    const res = await request(app).patch("/api/repositories/999").send({ language: "Rust" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/repositories/:id", () => {
  it("returns 204 on successful deletion", async () => {
    const app = createApp(createMockDb({ deleteResult: [baseRepo] }));
    const res = await request(app).delete("/api/repositories/1");
    expect(res.status).toBe(204);
  });

  it("returns 404 when not found", async () => {
    const app = createApp(createMockDb({ deleteResult: [] }));
    const res = await request(app).delete("/api/repositories/999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for non-numeric id", async () => {
    const app = createApp(createMockDb());
    const res = await request(app).delete("/api/repositories/abc");
    expect(res.status).toBe(400);
  });
});
