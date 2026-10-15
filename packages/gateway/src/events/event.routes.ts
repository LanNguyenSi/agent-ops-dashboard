import type { FastifyInstance, FastifyReply, preHandlerHookHandler } from "fastify";
import { eventService, type AgentEvent } from "./event.service.js";

function sendSSEEvent(reply: FastifyReply, event: { id: number; eventType: string }): void {
  reply.raw.write(`id: ${event.id}\n`);
  reply.raw.write(`event: ${event.eventType}\n`);
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function registerEventRoutes(
  fastify: FastifyInstance,
  preHandler?: preHandlerHookHandler,
): void {
  const guard = preHandler ? { preHandler } : {};
  // GET /api/events — query event log
  fastify.get("/api/events", guard, async (req, reply) => {
    const { agentId, eventType, since, cursor, limit } = req.query as Record<string, string>;

    const result = await eventService.getEvents({
      agentId,
      eventType,
      since,
      cursor: cursor ? parseInt(cursor) : undefined,
      limit: limit ? parseInt(limit) : 50,
    });

    return reply.send({
      events: result.events,
      count: result.events.length,
      nextCursor: result.nextCursor,
    });
  });

  // GET /api/events/stream — SSE live stream
  fastify.get("/api/events/stream", guard, async (req, reply) => {
    const { agentId, eventType } = req.query as Record<string, string>;
    const lastEventId = req.headers["last-event-id"];

    // Subscribe BEFORE the replay query. An event emitted while the query is
    // in flight is buffered here and flushed after the replay, so it is neither
    // lost nor delivered twice (the replay and the buffer are de-duplicated by
    // id).
    let replaying = true;
    let closed = false;
    const buffered: AgentEvent[] = [];
    const unsubscribe = eventService.subscribe({
      matches: (event) =>
        (!agentId || event.agentId === agentId) &&
        (!eventType || event.eventType === eventType),
      send: (event) => {
        if (replaying) buffered.push(event);
        else sendSSEEvent(reply, event);
      },
    });

    // Cleanup on disconnect
    req.raw.on("close", () => {
      closed = true;
      unsubscribe();
    });

    // Run the replay BEFORE any SSE header is written. A failed replay answers
    // 503 JSON (no event-stream headers): the browser's EventSource then errors
    // without ever firing onopen, so the client's reconnect backoff keeps
    // growing instead of resetting on every attempt. Going live after a failed
    // replay would also let the client advance its cursor past the gap.
    const sentIds = new Set<number>();
    let missed: AgentEvent[] = [];
    try {
      if (lastEventId) {
        const cursor = parseInt(String(lastEventId));
        if (!isNaN(cursor)) {
          missed = await eventService.getEventsSince(cursor, { agentId, eventType });
        }
      }
    } catch (err) {
      console.error("[events] replay failed, answering 503 so the client retries:", err);
      buffered.length = 0;
      unsubscribe();
      return reply.code(503).send({ error: "Event replay failed, retry" });
    }

    if (closed) return;
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      // CORS handled by @fastify/cors (allowlist via GATEWAY_ALLOWED_ORIGINS).
    });
    for (const event of missed) {
      sentIds.add(event.id);
      sendSSEEvent(reply, event);
    }
    replaying = false;
    for (const event of buffered.splice(0)) {
      if (!sentIds.has(event.id)) sendSSEEvent(reply, event);
    }

    // Send keepalive comment every 30s
    const keepAlive = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, 30_000);
    req.raw.on("close", () => clearInterval(keepAlive));

    // Keep handler open
    await new Promise<void>((resolve) => {
      req.raw.on("close", resolve);
    });
  });

  // GET /api/events/stats — quick stats
  fastify.get("/api/events/stats", guard, async (_req, reply) => {
    return reply.send({
      activeSubscribers: eventService.subscriberCount,
    });
  });
}
