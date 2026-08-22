import type { FastifyInstance, FastifyReply, preHandlerHookHandler } from 'fastify';
import type { AgentRegistry } from './registry.js';
import type { CommandPayload, SSEEvent } from './types.js';

// The /events SSE stream and the /agents/:id/command back-channel,
// extracted from index.ts so they can be unit-tested in isolation with
// app.inject, mirroring registerAgentRoutes / registerEventRoutes /
// registerStateRoutes. Wire format (headers, frame shape, event names) is
// unchanged from the previous inline implementation.
export function registerSseRoutes(
  fastify: FastifyInstance,
  registry: AgentRegistry,
  preHandler?: preHandlerHookHandler,
): void {
  const guard = preHandler ? { preHandler } : {};

  // SSE clients currently connected to /events.
  const sseClients = new Set<{ reply: FastifyReply }>();

  function broadcast(message: SSEEvent) {
    const payload = `data: ${JSON.stringify(message)}\n\n`;
    for (const client of sseClients) {
      try {
        client.reply.raw.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Broadcast registry updates (agent:registered/updated/offline/deleted) to
  // all SSE subscribers.
  registry.onUpdate((agent, event) => {
    broadcast({ type: event, data: agent, timestamp: new Date().toISOString() });
  });

  // ── Back-channel command ────────────────────────────────────
  fastify.post<{ Params: { id: string }; Body: CommandPayload }>(
    '/agents/:id/command',
    guard,
    async (req, reply) => {
      const agent = registry.get(req.params.id);
      if (!agent) return reply.code(404).send({ error: 'Agent not found' });
      broadcast({
        type: 'agent:command',
        data: { agentId: req.params.id, ...req.body },
        timestamp: new Date().toISOString(),
      });
      return { ok: true };
    },
  );

  // ── SSE stream ──────────────────────────────────────────────
  fastify.get('/events', guard, async (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    reply.hijack();

    // Send current snapshot on connect
    const snapshotMessage: SSEEvent = {
      type: 'snapshot',
      data: registry.getAll(),
      timestamp: new Date().toISOString(),
    };
    reply.raw.write(`data: ${JSON.stringify(snapshotMessage)}\n\n`);

    const client = { reply };
    sseClients.add(client);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      reply.raw.write(': ping\n\n');
    }, 30_000);

    // Settle the handler once the client disconnects instead of leaving it
    // pending forever, so Fastify (and test injection) can observe the
    // request lifecycle completing.
    await new Promise<void>((resolve) => {
      req.raw.on('close', () => {
        sseClients.delete(client);
        clearInterval(keepAlive);
        resolve();
      });
    });
  });
}
