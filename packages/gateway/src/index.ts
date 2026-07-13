import Fastify from 'fastify';
import type { FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { AgentRegistry } from './registry.js';
import { CommandPayload } from './types.js';
import { hasDatabase } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { registerStateRoutes } from './state/state.routes.js';
import { registerEventRoutes } from './events/event.routes.js';
import { registerAgentRoutes } from './agent.routes.js';
import { loadAuthConfig, makeRequireAuth } from './auth/auth.js';
import { loadAllowedOrigins } from './auth/cors.js';

const fastify = Fastify({ logger: true });
const registry = new AgentRegistry();

const authConfig = loadAuthConfig();
const requireAuth = makeRequireAuth(authConfig);
if (!authConfig.token) {
  fastify.log.warn(
    'GATEWAY_TOKEN is not configured — authenticated endpoints will respond 503. Set GATEWAY_TOKEN to enable the gateway.',
  );
}

// SSE clients
const sseClients = new Set<{ reply: FastifyReply }>();

// Broadcast to all SSE subscribers
registry.onUpdate((agent, event) => {
  const payload = `data: ${JSON.stringify({ type: event, data: agent, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.reply.raw.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
});

const allowedOrigins = loadAllowedOrigins();
await fastify.register(cors, { origin: allowedOrigins });

// ── Health ──────────────────────────────────────────────────
// Public on purpose: used by Traefik, Docker, and the public
// triologue dashboard for liveness probes. Returns no agent data.
fastify.get('/health', async () => {
  return { status: 'ok', agents: registry.getAll().length, timestamp: new Date().toISOString() };
});

// ── Agent registry routes (register / heartbeat / get / list / delete) ──
registerAgentRoutes(fastify, registry, requireAuth);

// ── Back-channel command ────────────────────────────────────
fastify.post<{ Params: { id: string }; Body: CommandPayload }>(
  '/agents/:id/command',
  { preHandler: requireAuth },
  async (req, reply) => {
    const agent = registry.get(req.params.id);
    if (!agent) return reply.code(404).send({ error: 'Agent not found' });
    const event = JSON.stringify({
      type: 'agent:command',
      data: { agentId: req.params.id, ...req.body },
      timestamp: new Date().toISOString(),
    });
    for (const client of sseClients) {
      try {
        client.reply.raw.write(`data: ${event}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
    return { ok: true };
  }
);

// ── SSE stream ──────────────────────────────────────────────
fastify.get('/events', { preHandler: requireAuth }, async (req, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send current snapshot on connect
  const snapshot = JSON.stringify({
    type: 'snapshot',
    data: registry.getAll(),
    timestamp: new Date().toISOString(),
  });
  reply.raw.write(`data: ${snapshot}\n\n`);

  const client = { reply };
  sseClients.add(client);

  req.raw.on('close', () => {
    sseClients.delete(client);
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    reply.raw.write(': ping\n\n');
  }, 30_000);

  req.raw.on('close', () => clearInterval(keepAlive));

  await new Promise(() => {}); // keep handler open
});

// ── PostgreSQL Features (State Store + Activity Feed) ────────
if (hasDatabase()) {
  try {
    await runMigrations();
    registerStateRoutes(fastify, requireAuth);
    registerEventRoutes(fastify, requireAuth);
    console.log('[db] State store + Activity Feed routes registered');
  } catch (err) {
    console.error('[db] Failed to initialize DB features:', err);
    // Non-fatal: gateway still starts without DB features
  }
} else {
  // Still register event routes (in-memory SSE works without DB)
  registerEventRoutes(fastify, requireAuth);
  console.log('[db] DATABASE_URL not set — running in memory-only mode');
}

// ── Start ────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001);
await fastify.listen({ port, host: '0.0.0.0' });
console.log(`agent-ops-gateway running on port ${port}`);
