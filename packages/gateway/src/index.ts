import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AgentRegistry } from './registry.js';
import { hasDatabase } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { registerStateRoutes } from './state/state.routes.js';
import { registerEventRoutes } from './events/event.routes.js';
import { registerAgentRoutes } from './agent.routes.js';
import { registerSseRoutes } from './sse.routes.js';
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

// ── SSE stream + back-channel command ────────────────────────
registerSseRoutes(fastify, registry, requireAuth);

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
