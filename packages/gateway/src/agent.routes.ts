import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { AgentRegistry } from './registry.js';
import type { RegisterPayload, HeartbeatPayload } from './types.js';
import { eventService } from './events/event.service.js';

// Agent registry HTTP routes (register / heartbeat / get / list / delete),
// extracted from index.ts so they can be unit-tested in isolation, mirroring
// registerStateRoutes / registerEventRoutes.
export function registerAgentRoutes(
  fastify: FastifyInstance,
  registry: AgentRegistry,
  preHandler?: preHandlerHookHandler,
): void {
  const guard = preHandler ? { preHandler } : {};

  // ── Agent Registration ──────────────────────────────────────
  fastify.post<{ Body: RegisterPayload }>('/agents/register', guard, async (req, reply) => {
    const agent = registry.register(req.body);
    await eventService
      .emit('agent.registered', agent.id, {
        agentId: agent.id,
        name: agent.name,
        tags: (req.body as any).tags,
        meta: (req.body as any).meta,
      })
      .catch(() => {});
    return reply.code(201).send(agent);
  });

  // ── Heartbeat ───────────────────────────────────────────────
  fastify.post<{ Params: { id: string }; Body: HeartbeatPayload }>(
    '/agents/:id/heartbeat',
    guard,
    async (req, reply) => {
      const agent = registry.heartbeat(req.params.id, req.body);
      if (!agent) return reply.code(404).send({ error: 'Agent not found' });
      await eventService
        .emit('agent.heartbeat', req.params.id, {
          agentId: req.params.id,
          status: (req.body as any).status ?? 'online',
        })
        .catch(() => {});
      return agent;
    },
  );

  // ── Get agent ───────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/agents/:id', guard, async (req, reply) => {
    const agent = registry.get(req.params.id);
    if (!agent) return reply.code(404).send({ error: 'Agent not found' });
    return agent;
  });

  // ── List agents ─────────────────────────────────────────────
  fastify.get('/agents', guard, async () => {
    return registry.getAll();
  });

  // ── Delete agent ────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/agents/:id', guard, async (req, reply) => {
    const deleted = registry.delete(req.params.id);
    if (!deleted) return reply.code(404).send({ error: 'Agent not found' });
    return { ok: true };
  });
}
