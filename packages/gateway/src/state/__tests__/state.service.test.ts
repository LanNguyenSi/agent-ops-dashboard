import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db pool
const mockQuery = vi.fn();
vi.mock("../../db/pool.js", () => ({
  getPool: () => ({ query: mockQuery }),
  hasDatabase: () => true,
}));

// Mock event service to avoid DB calls from emit
vi.mock("../../events/event.service.js", () => ({
  eventService: { emit: vi.fn().mockResolvedValue({}) },
}));

import {
  listNamespace,
  getState,
  setState,
  deleteState,
  casState,
} from "../state.service.js";

const now = new Date("2026-03-28T15:00:00Z");

const fakeRow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  namespace: "agent-alpha",
  key: "task_queue",
  value: { tasks: ["analyze", "report"] },
  version: 1,
  updated_by: "agent-alpha",
  updated_at: now,
  created_at: now,
};

beforeEach(() => vi.clearAllMocks());

describe("listNamespace", () => {
  it("returns keys for a namespace", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ key: "task_queue", version: 1, updated_by: null, updated_at: now }],
    });
    const result = await listNamespace("agent-alpha");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("task_queue");
    expect(result[0].version).toBe(1);
  });

  it("returns empty array for empty namespace", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await listNamespace("empty-ns");
    expect(result).toEqual([]);
  });
});

describe("getState", () => {
  it("returns entry when found", async () => {
    mockQuery.mockResolvedValue({ rows: [fakeRow] });
    const entry = await getState("agent-alpha", "task_queue");
    expect(entry).not.toBeNull();
    expect(entry!.namespace).toBe("agent-alpha");
    expect(entry!.key).toBe("task_queue");
    expect(entry!.version).toBe(1);
  });

  it("returns null when not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const entry = await getState("ns", "missing-key");
    expect(entry).toBeNull();
  });
});

describe("setState", () => {
  it("creates new entry (version 1)", async () => {
    mockQuery.mockResolvedValue({ rows: [{ ...fakeRow, version: 1 }] });
    const entry = await setState("agent-alpha", "task_queue", { tasks: [] });
    expect(entry.version).toBe(1);
  });

  it("updates existing entry (version increments)", async () => {
    mockQuery.mockResolvedValue({ rows: [{ ...fakeRow, version: 2 }] });
    const entry = await setState("agent-alpha", "task_queue", { tasks: ["x"] });
    expect(entry.version).toBe(2);
  });

  it("passes updatedBy to query", async () => {
    mockQuery.mockResolvedValue({ rows: [{ ...fakeRow, updated_by: "bot" }] });
    const entry = await setState("ns", "k", {}, "bot");
    expect(entry.updatedBy).toBe("bot");
  });
});

describe("deleteState", () => {
  it("returns true when deleted", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "some-id" }] });
    const result = await deleteState("ns", "k");
    expect(result).toBe(true);
  });

  it("returns false when not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await deleteState("ns", "missing");
    expect(result).toBe(false);
  });
});

describe("casState", () => {
  it("returns ok=true when version matches", async () => {
    // CAS UPDATE returns row
    mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeRow, version: 2 }] });
    const result = await casState("ns", "k", 1, { x: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entry.version).toBe(2);
  });

  it("returns conflict when version mismatches", async () => {
    // CAS UPDATE returns 0 rows
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // getState check returns existing entry with version 3
    mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeRow, version: 3 }] });
    const result = await casState("ns", "k", 1, { x: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("conflict");
      if (result.reason === "conflict") {
        expect(result.actualVersion).toBe(3);
        expect(result.expectedVersion).toBe(1);
      }
    }
  });

  it("returns not_found when key missing", async () => {
    // CAS UPDATE returns 0 rows
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // getState check returns null
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await casState("ns", "missing", 1, {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
  });
});
