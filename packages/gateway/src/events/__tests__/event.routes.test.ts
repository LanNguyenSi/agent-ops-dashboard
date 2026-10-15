import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

const mockGetEvents = vi.fn();
const mockGetEventsSince = vi.fn();
const mockSubscribe = vi.fn();
let subscriberCountValue = 0;

vi.mock("../event.service.js", () => ({
  eventService: {
    getEvents: (...args: unknown[]) => mockGetEvents(...args),
    getEventsSince: (...args: unknown[]) => mockGetEventsSince(...args),
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    get subscriberCount() {
      return subscriberCountValue;
    },
  },
}));

import { registerEventRoutes } from "../event.routes.js";

// Fake fastify: captures the (path, opts, handler) registered for each
// route so handlers can be invoked directly, avoiding a real `.inject()`
// call against the never-resolving SSE handler.
function makeFakeFastify() {
  const store: Record<string, { opts: any; handler: any }> = {};
  const fastify = {
    get(path: string, opts: any, handler: any) {
      store[path] = { opts, handler };
    },
  };
  return { fastify: fastify as any, store };
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

function makeReply() {
  return {
    send: vi.fn((body: unknown) => body),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  subscriberCountValue = 0;
});

describe("GET /api/events", () => {
  it("coerces cursor/limit query strings to ints and returns the {events,count,nextCursor} shape", async () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);
    mockGetEvents.mockResolvedValue({ events: [{ id: 1 }, { id: 2 }], nextCursor: 5 });

    const req = { query: { cursor: "10", limit: "25" } };
    const reply = makeReply();
    await store["/api/events"].handler(req, reply);

    expect(mockGetEvents).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: 10, limit: 25 })
    );
    expect(reply.send).toHaveBeenCalledWith({
      events: [{ id: 1 }, { id: 2 }],
      count: 2,
      nextCursor: 5,
    });
  });

  it("defaults limit to 50 and cursor to undefined when absent from the query", async () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);
    mockGetEvents.mockResolvedValue({ events: [], nextCursor: null });

    const req = { query: {} };
    const reply = makeReply();
    await store["/api/events"].handler(req, reply);

    expect(mockGetEvents).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: undefined, limit: 50 })
    );
  });
});

describe("GET /api/events/stream", () => {
  function makeStreamReq(headers: Record<string, string> = {}) {
    const raw = new EventEmitter() as any;
    raw.writeHead = vi.fn();
    raw.write = vi.fn();
    const req = { raw, query: {}, headers };
    const reply = { raw };
    return { req, reply, raw };
  }

  it("writes SSE headers, replays missed events for a valid last-event-id, streams a live event, and cleans up on close", async () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);

    mockGetEventsSince.mockResolvedValue([
      { id: 1, eventType: "agent.registered", agentId: "a1" },
    ]);

    let capturedSubscriber: any;
    const unsubscribe = vi.fn();
    mockSubscribe.mockImplementation((sub: any) => {
      capturedSubscriber = sub;
      return unsubscribe;
    });

    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const { req, reply, raw } = makeStreamReq({ "last-event-id": "1" });

    const handlerPromise = store["/api/events/stream"].handler(req, reply);
    // Let the replay's await eventService.getEventsSince(...) resolve.
    await flush();

    expect(raw.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "Content-Type": "text/event-stream" })
    );
    expect(mockGetEventsSince).toHaveBeenCalledWith(1, expect.objectContaining({}));
    // Replay framing.
    expect(raw.write).toHaveBeenCalledWith("id: 1\n");
    expect(raw.write).toHaveBeenCalledWith("event: agent.registered\n");
    expect(raw.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ id: 1, eventType: "agent.registered", agentId: "a1" })}\n\n`
    );

    // Live event via the captured subscriber.
    expect(capturedSubscriber).toBeDefined();
    capturedSubscriber.send({ id: 2, eventType: "agent.heartbeat" });
    expect(raw.write).toHaveBeenCalledWith("id: 2\n");
    expect(raw.write).toHaveBeenCalledWith("event: agent.heartbeat\n");

    // Disconnect: clearInterval + unsubscribe run, handler promise resolves.
    raw.emit("close");
    await handlerPromise;
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();

    clearIntervalSpy.mockRestore();
  });

  it("skips replay when last-event-id is not a number (NaN)", async () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);
    mockSubscribe.mockReturnValue(vi.fn());

    const { req, reply, raw } = makeStreamReq({ "last-event-id": "not-a-number" });

    const handlerPromise = store["/api/events/stream"].handler(req, reply);
    await flush();

    expect(mockGetEventsSince).not.toHaveBeenCalled();

    raw.emit("close");
    await handlerPromise;
  });

  it("subscribes before the replay query and delivers an event emitted during the query exactly once", async () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);

    let resolveReplay!: (events: unknown[]) => void;
    mockGetEventsSince.mockReturnValue(
      new Promise((resolve) => {
        resolveReplay = resolve;
      })
    );
    let capturedSubscriber: any;
    mockSubscribe.mockImplementation((sub: any) => {
      capturedSubscriber = sub;
      return vi.fn();
    });

    const { req, reply, raw } = makeStreamReq({ "last-event-id": "3" });
    const handlerPromise = store["/api/events/stream"].handler(req, reply);
    await flush();

    // The replay query is still in flight, the subscriber must already exist.
    expect(mockGetEventsSince).toHaveBeenCalledOnce();
    expect(capturedSubscriber).toBeDefined();

    // Event 5 is emitted while the query runs and is ALSO part of the result
    // (it was committed before the SELECT ran); event 6 is only live.
    capturedSubscriber.send({ id: 5, eventType: "agent.heartbeat" });
    capturedSubscriber.send({ id: 6, eventType: "agent.heartbeat" });
    expect(raw.write).not.toHaveBeenCalledWith("id: 5\n");

    resolveReplay([
      { id: 4, eventType: "agent.heartbeat" },
      { id: 5, eventType: "agent.heartbeat" },
    ]);
    await flush();

    const idFrames = raw.write.mock.calls.map((c: unknown[]) => c[0]).filter((w: string) => w.startsWith("id: "));
    expect(idFrames).toEqual(["id: 4\n", "id: 5\n", "id: 6\n"]);

    // After the replay, live events go straight through.
    capturedSubscriber.send({ id: 7, eventType: "agent.heartbeat" });
    expect(raw.write).toHaveBeenCalledWith("id: 7\n");

    raw.emit("close");
    await handlerPromise;
  });

  it("keeps the live stream running when the replay query fails", async () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetEventsSince.mockRejectedValue(new Error("db down"));
    let capturedSubscriber: any;
    mockSubscribe.mockImplementation((sub: any) => {
      capturedSubscriber = sub;
      return vi.fn();
    });

    const { req, reply, raw } = makeStreamReq({ "last-event-id": "1" });
    const handlerPromise = store["/api/events/stream"].handler(req, reply);
    await flush();

    capturedSubscriber.send({ id: 9, eventType: "agent.heartbeat" });
    expect(raw.write).toHaveBeenCalledWith("id: 9\n");

    raw.emit("close");
    await handlerPromise;
    errSpy.mockRestore();
  });

  it("subscribes immediately and never queries when no last-event-id is sent", async () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);
    let capturedSubscriber: any;
    mockSubscribe.mockImplementation((sub: any) => {
      capturedSubscriber = sub;
      return vi.fn();
    });

    const { req, reply, raw } = makeStreamReq();
    const handlerPromise = store["/api/events/stream"].handler(req, reply);
    await flush();

    expect(mockGetEventsSince).not.toHaveBeenCalled();
    capturedSubscriber.send({ id: 1, eventType: "agent.registered" });
    expect(raw.write).toHaveBeenCalledWith("id: 1\n");

    raw.emit("close");
    await handlerPromise;
  });
});

describe("GET /api/events/stats", () => {
  it("returns { activeSubscribers }", async () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);
    subscriberCountValue = 3;

    const reply = makeReply();
    await store["/api/events/stats"].handler({}, reply);

    expect(reply.send).toHaveBeenCalledWith({ activeSubscribers: 3 });
  });
});

describe("preHandler wiring", () => {
  it("stores the given preHandler on every registered route", () => {
    const { fastify, store } = makeFakeFastify();
    const preHandler = vi.fn();
    registerEventRoutes(fastify, preHandler);

    expect(store["/api/events"].opts.preHandler).toBe(preHandler);
    expect(store["/api/events/stream"].opts.preHandler).toBe(preHandler);
    expect(store["/api/events/stats"].opts.preHandler).toBe(preHandler);
  });

  it("omits preHandler from route opts when not provided", () => {
    const { fastify, store } = makeFakeFastify();
    registerEventRoutes(fastify);

    expect(store["/api/events"].opts).not.toHaveProperty("preHandler");
    expect(store["/api/events/stream"].opts).not.toHaveProperty("preHandler");
    expect(store["/api/events/stats"].opts).not.toHaveProperty("preHandler");
  });
});
