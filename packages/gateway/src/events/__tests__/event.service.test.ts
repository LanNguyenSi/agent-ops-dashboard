import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("../../db/pool.js", () => ({
  getPool: () => ({ query: mockQuery }),
  hasDatabase: () => true,
}));

import { EventService, EVENT_TYPES } from "../event.service.js";

const now = new Date("2026-03-28T16:00:00Z");

const fakeEventRow = {
  id: BigInt(42),
  agent_id: "agent-alpha",
  event_type: "agent.registered",
  payload: { name: "Lava" },
  created_at: now,
};

beforeEach(() => vi.clearAllMocks());

describe("EventService.emit", () => {
  it("inserts event into DB and returns it", async () => {
    const svc = new EventService();
    mockQuery.mockResolvedValue({ rows: [fakeEventRow] });
    const event = await svc.emit(EVENT_TYPES.AGENT_REGISTERED, "agent-alpha", { name: "Lava" });
    expect(event.id).toBe(42);
    expect(event.agentId).toBe("agent-alpha");
    expect(event.eventType).toBe("agent.registered");
    expect(mockQuery).toHaveBeenCalledOnce();
  });

  it("broadcasts to matching subscribers", async () => {
    const svc = new EventService();
    mockQuery.mockResolvedValue({ rows: [fakeEventRow] });
    const received: unknown[] = [];
    svc.subscribe({
      matches: () => true,
      send: (e) => received.push(e),
    });
    await svc.emit(EVENT_TYPES.AGENT_REGISTERED, "agent-alpha", {});
    expect(received).toHaveLength(1);
  });

  it("does not broadcast to non-matching subscribers", async () => {
    const svc = new EventService();
    mockQuery.mockResolvedValue({ rows: [fakeEventRow] });
    const received: unknown[] = [];
    svc.subscribe({
      matches: () => false,
      send: (e) => received.push(e),
    });
    await svc.emit(EVENT_TYPES.AGENT_REGISTERED, "agent-alpha", {});
    expect(received).toHaveLength(0);
  });
});

describe("EventService.getEvents", () => {
  it("returns events with nextCursor=null when fewer than limit", async () => {
    const svc = new EventService();
    mockQuery.mockResolvedValue({ rows: [fakeEventRow] });
    const result = await svc.getEvents({ limit: 50 });
    expect(result.events).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when results == limit+1 (has more)", async () => {
    const svc = new EventService();
    // Simulate 3 rows returned for limit=2 (3 = limit+1)
    const rows = [
      { ...fakeEventRow, id: BigInt(1) },
      { ...fakeEventRow, id: BigInt(2) },
      { ...fakeEventRow, id: BigInt(3) }, // extra row
    ];
    mockQuery.mockResolvedValue({ rows });
    const result = await svc.getEvents({ limit: 2 });
    expect(result.events).toHaveLength(2); // extra trimmed
    expect(result.nextCursor).toBe(2); // last event's id
  });

  it("passes filter params to query", async () => {
    const svc = new EventService();
    mockQuery.mockResolvedValue({ rows: [] });
    await svc.getEvents({ agentId: "a1", eventType: "agent.heartbeat", cursor: 10 });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(params).toContain("a1");
    expect(params).toContain("agent.heartbeat");
    expect(params).toContain(10);
  });
});

describe("EventService.subscribe/unsubscribe", () => {
  it("removes subscriber when unsubscribe is called", async () => {
    const svc = new EventService();
    mockQuery.mockResolvedValue({ rows: [fakeEventRow] });
    const received: unknown[] = [];
    const unsubscribe = svc.subscribe({ matches: () => true, send: (e) => received.push(e) });
    expect(svc.subscriberCount).toBe(1);
    unsubscribe();
    expect(svc.subscriberCount).toBe(0);
    await svc.emit(EVENT_TYPES.AGENT_HEARTBEAT, "a1", {});
    expect(received).toHaveLength(0);
  });

  it("tracks subscriber count correctly", () => {
    const svc = new EventService();
    const unsub1 = svc.subscribe({ matches: () => true, send: () => {} });
    const unsub2 = svc.subscribe({ matches: () => true, send: () => {} });
    expect(svc.subscriberCount).toBe(2);
    unsub1();
    expect(svc.subscriberCount).toBe(1);
    unsub2();
    expect(svc.subscriberCount).toBe(0);
  });
});

describe("EVENT_TYPES constants", () => {
  it("has all required event types", () => {
    expect(EVENT_TYPES.AGENT_REGISTERED).toBe("agent.registered");
    expect(EVENT_TYPES.AGENT_HEARTBEAT).toBe("agent.heartbeat");
    expect(EVENT_TYPES.STATE_SET).toBe("state.set");
    expect(EVENT_TYPES.STATE_CAS_SUCCESS).toBe("state.cas.success");
    expect(EVENT_TYPES.STATE_CAS_CONFLICT).toBe("state.cas.conflict");
  });
});
