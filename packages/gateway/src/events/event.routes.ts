import type { FastifyInstance } from "fastify";
import { eventService } from "./event.service.js";

function sendSSEEvent(reply: any, event: { id: number; eventType: string }): void {
  reply.raw.write(`id: ${event.id}\n`);
  reply.raw.write(`event: ${event.eventType}\n`);
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function registerEventRoutes(fastify: FastifyInstance): void {
  // GET /api/events — query event log
  fastify.get("/api/events", async (req: any, reply: any) => {
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
  fastify.get("/api/events/stream", async (req: any, reply: any) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });

    const { agentId, eventType } = req.query as Record<string, string>;
    const lastEventId = req.headers["last-event-id"];

    // Replay missed events on reconnect
    if (lastEventId) {
      const cursor = parseInt(String(lastEventId));
      if (!isNaN(cursor)) {
        const missed = await eventService.getEventsSince(cursor, { agentId, eventType });
        for (const event of missed) {
          sendSSEEvent(reply, event);
        }
      }
    }

    // Send keepalive comment every 30s
    const keepAlive = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, 30_000);

    // Subscribe to live events
    const unsubscribe = eventService.subscribe({
      matches: (event) =>
        (!agentId || event.agentId === agentId) &&
        (!eventType || event.eventType === eventType),
      send: (event) => sendSSEEvent(reply, event),
    });

    // Cleanup on disconnect
    req.raw.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });

    // Keep handler open
    await new Promise<void>((resolve) => {
      req.raw.on("close", resolve);
    });
  });

  // GET /api/events/stats — quick stats
  fastify.get("/api/events/stats", async (_req: any, reply: any) => {
    return reply.send({
      activeSubscribers: eventService.subscriberCount,
    });
  });
}
