/**
 * SSE Subscriber Leak Test
 * Verifies that subscribers are cleaned up on disconnect with no memory leak.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../db/pool.js", () => ({
  getPool: () => ({ query: vi.fn().mockResolvedValue({ rows: [] }) }),
  hasDatabase: () => false, // in-memory mode
}));

import { EventService } from "../event.service.js";

beforeEach(() => vi.clearAllMocks());

describe("SSE Subscriber Leak Test", () => {
  it("tracks subscribers and removes them on unsubscribe", () => {
    const svc = new EventService();
    expect(svc.subscriberCount).toBe(0);

    const unsubscribers: Array<() => void> = [];
    for (let i = 0; i < 50; i++) {
      const unsub = svc.subscribe({ matches: () => true, send: () => {} });
      unsubscribers.push(unsub);
    }
    expect(svc.subscriberCount).toBe(50);

    // Disconnect all
    unsubscribers.forEach((unsub) => unsub());
    expect(svc.subscriberCount).toBe(0);
  });

  it("handles broken subscriber gracefully (removes it on send error)", async () => {
    const svc = new EventService();

    // Subscriber that throws on send
    svc.subscribe({
      matches: () => true,
      send: () => { throw new Error("Connection lost"); },
    });

    // Should not throw
    await expect(
      svc.emit("agent.heartbeat", "agent-1", { status: "online" })
    ).resolves.not.toThrow();

    // Broken subscriber should be removed
    expect(svc.subscriberCount).toBe(0);
  });

  it("concurrent subscribers receive events independently", async () => {
    const svc = new EventService();
    const received1: unknown[] = [];
    const received2: unknown[] = [];

    const unsub1 = svc.subscribe({
      matches: (e) => e.agentId === "a1",
      send: (e) => received1.push(e),
    });
    const unsub2 = svc.subscribe({
      matches: (e) => e.agentId === "a2",
      send: (e) => received2.push(e),
    });

    await svc.emit("agent.heartbeat", "a1", {});
    await svc.emit("agent.heartbeat", "a2", {});
    await svc.emit("agent.heartbeat", "a1", {});

    expect(received1).toHaveLength(2); // only a1 events
    expect(received2).toHaveLength(1); // only a2 events

    unsub1();
    unsub2();
    expect(svc.subscriberCount).toBe(0);
  });

  it("partial subscribe/unsubscribe maintains correct count", () => {
    const svc = new EventService();
    const unsubs: Array<() => void> = [];

    for (let i = 0; i < 10; i++) {
      unsubs.push(svc.subscribe({ matches: () => true, send: () => {} }));
    }
    expect(svc.subscriberCount).toBe(10);

    // Unsubscribe half
    for (let i = 0; i < 5; i++) unsubs[i]();
    expect(svc.subscriberCount).toBe(5);

    // Unsubscribe the rest
    for (let i = 5; i < 10; i++) unsubs[i]();
    expect(svc.subscriberCount).toBe(0);
  });
});
