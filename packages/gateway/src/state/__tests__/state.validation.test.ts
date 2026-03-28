/**
 * State route validation tests — ensure 400s for bad input, consistent error shapes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";

vi.mock("../../db/pool.js", () => ({
  getPool: () => ({ query: vi.fn() }),
  hasDatabase: () => true,
}));

vi.mock("../../events/event.service.js", () => ({
  eventService: { emit: vi.fn().mockResolvedValue({}) },
}));

vi.mock("../state.service.js", () => ({
  listNamespace: vi.fn().mockResolvedValue([]),
  getState: vi.fn().mockResolvedValue(null),
  setState: vi.fn().mockResolvedValue({ id: "x", namespace: "ns", key: "k", value: {}, version: 1, updatedBy: null, updatedAt: "2026-01-01", createdAt: "2026-01-01" }),
  deleteState: vi.fn().mockResolvedValue(false),
  casState: vi.fn().mockResolvedValue({ ok: false, reason: "not_found" }),
}));

import { registerStateRoutes } from "../state.routes.js";

async function buildApp() {
  const app = Fastify();
  registerStateRoutes(app);
  await app.ready();
  return app;
}

beforeEach(() => vi.clearAllMocks());

describe("State Routes — Input Validation", () => {
  it("PUT /api/state/:ns/:key returns 400 for missing value", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PUT",
      url: "/api/state/ns/key",
      payload: { updatedBy: "test" }, // missing value
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("PUT /api/state/:ns/:key returns 400 for non-object value", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PUT",
      url: "/api/state/ns/key",
      payload: { value: "not-an-object" },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("VALIDATION_ERROR");
  });

  it("POST /api/state/:ns/:key/cas returns 400 for missing expectedVersion", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/state/ns/key/cas",
      payload: { value: { x: 1 } }, // missing expectedVersion
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("VALIDATION_ERROR");
  });

  it("POST /api/state/:ns/:key/cas returns 400 for non-positive expectedVersion", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/state/ns/key/cas",
      payload: { expectedVersion: -1, value: { x: 1 } },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/state/:ns/:key returns 404 for missing key", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/state/ns/missing" });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("DELETE /api/state/:ns/:key returns 404 for non-existent key", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: "/api/state/ns/gone" });
    expect(res.statusCode).toBe(404);
  });

  it("PUT /api/state/:ns/:key returns 200 with valid body", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PUT",
      url: "/api/state/ns/key",
      payload: { value: { x: 1 }, updatedBy: "agent" },
    });
    expect(res.statusCode).toBe(200);
  });
});
