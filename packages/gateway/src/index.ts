import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AgentRegistry } from './registry.js';
import { RegisterPayload, HeartbeatPayload, CommandPayload } from './types.js';

const fastify = Fastify({ logger: true });
const registry = new AgentRegistry();

// SSE clients
const sseClients = new Set<{ reply: any }>();

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

await fastify.register(cors, { origin: '*' });

// ── Health ──────────────────────────────────────────────────
fastify.get('/health', async () => {
  return { status: 'ok', agents: registry.getAll().length, timestamp: new Date().toISOString() };
});

// ── Agent Registration ──────────────────────────────────────
fastify.post<{ Body: RegisterPayload }>('/agents/register', async (req, reply) => {
  const agent = registry.register(req.body);
  return reply.code(201).send(agent);
});

// ── Heartbeat ───────────────────────────────────────────────
fastify.post<{ Params: { id: string }; Body: HeartbeatPayload }>(
  '/agents/:id/heartbeat',
  async (req, reply) => {
    const agent = registry.heartbeat(req.params.id, req.body);
    if (!agent) return reply.code(404).send({ error: 'Agent not found' });
    return agent;
  }
);

// ── Get agent ───────────────────────────────────────────────
fastify.get<{ Params: { id: string } }>('/agents/:id', async (req, reply) => {
  const agent = registry.get(req.params.id);
  if (!agent) return reply.code(404).send({ error: 'Agent not found' });
  return agent;
});

// ── List agents ─────────────────────────────────────────────
fastify.get('/agents', async () => {
  return registry.getAll();
});

// ── Back-channel command ────────────────────────────────────
fastify.post<{ Params: { id: string }; Body: CommandPayload }>(
  '/agents/:id/command',
  async (req, reply) => {
    const agent = registry.get(req.params.id);
    if (!agent) return reply.code(404).send({ error: 'Agent not found' });
    // For now: log command + broadcast via SSE
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
fastify.get('/events', async (req, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
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

// ── Start ────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001);
await fastify.listen({ port, host: '0.0.0.0' });
console.log(`agent-ops-gateway running on port ${port}`);
