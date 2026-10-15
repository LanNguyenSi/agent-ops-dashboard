import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AgentRegistry } from './registry.js';
import { registerDbFeatures } from './db-features.js';
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
await registerDbFeatures(fastify, requireAuth);

// ── Start ────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001);
await fastify.listen({ port, host: '0.0.0.0' });
console.log(`agent-ops-gateway running on port ${port}`);
