import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { SSEEvent } from '../types.js';

// Point the registry's persistence at a throwaway tmp file so the suite
// never reads or writes the real agent-registry.json in the package dir.
// Set before the registry module is imported (PERSIST_FILE is resolved at
// module load), hence the dynamic imports in beforeAll.
const REGISTRY_FILE = path.join(os.tmpdir(), `agent-registry-sse-routes-test-${process.pid}.json`);
const TOKEN = 'test-gateway-token';

let registerSseRoutes: typeof import('../sse.routes.js').registerSseRoutes;
let AgentRegistry: typeof import('../registry.js').AgentRegistry;
let makeRequireAuth: typeof import('../auth/auth.js').makeRequireAuth;
let loadAuthConfig: typeof import('../auth/auth.js').loadAuthConfig;

beforeAll(async () => {
  process.env.REGISTRY_FILE = REGISTRY_FILE;
  ({ registerSseRoutes } = await import('../sse.routes.js'));
  ({ AgentRegistry } = await import('../registry.js'));
  ({ makeRequireAuth, loadAuthConfig } = await import('../auth/auth.js'));
});

afterAll(() => {
  fs.rmSync(REGISTRY_FILE, { force: true });
  delete process.env.REGISTRY_FILE;
});

function buildApp() {
  const registry = new AgentRegistry();
  const requireAuth = makeRequireAuth(loadAuthConfig({ GATEWAY_TOKEN: TOKEN } as NodeJS.ProcessEnv));
  const app = Fastify();
  registerSseRoutes(app, registry, requireAuth);
  return { app, registry };
}

// Parses one or more "data: <json>\n\n" SSE frames out of a raw chunk of
// stream text.
function parseSseFrames(raw: string): SSEEvent[] {
  return raw
    .split('\n\n')
    .map((block) => block.trim())
    .filter((block) => block.startsWith('data: '))
    .map((block) => JSON.parse(block.slice('data: '.length)) as SSEEvent);
}

describe('GET /events', () => {
  let app: FastifyInstance | undefined;
  const auth = { authorization: `Bearer ${TOKEN}` };

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
    fs.rmSync(REGISTRY_FILE, { force: true });
  });

  it('sends the initial snapshot frame with type "snapshot" carrying an Agent[]', async () => {
    const built = buildApp();
    app = built.app;
    const agent = built.registry.register({ name: 'probe' });

    // `payloadAsStream: true` resolves the injected request as soon as
    // headers are written (light-my-request's Response#writeHead override)
    // instead of waiting for the response to end, since this route only
    // ever ends when the client disconnects. Emitting 'close' on the
    // underlying request (reachable via the fake ServerResponse's own `req`
    // reference, same as Node's real http.ServerResponse) simulates that
    // disconnect so the route's pending promise resolves (see
    // sse.routes.ts) instead of leaking its keepalive interval.
    const res = await app.inject({
      method: 'GET',
      url: '/events',
      headers: auth,
      payloadAsStream: true,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');

    const chunk = await res.stream()[Symbol.asyncIterator]().next();
    const frames = parseSseFrames((chunk.value as Buffer).toString('utf-8'));
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].type).toBe('snapshot');
    expect(Array.isArray(frames[0].data)).toBe(true);
    expect(frames[0].data).toEqual([agent]);

    expect(res.raw.res.req).toBeDefined();
    res.raw.res.req.emit('close');
  });

  it('broadcasts an agent:registered frame when an agent is registered during the stream', async () => {
    const built = buildApp();
    app = built.app;

    const eventsRes = await app.inject({
      method: 'GET',
      url: '/events',
      headers: auth,
      payloadAsStream: true,
    });
    const stream = eventsRes.stream();
    const iterator = stream[Symbol.asyncIterator]() as AsyncIterator<Buffer>;

    // Read the initial snapshot frame
    const first = await iterator.next();
    const snapshotFrame = parseSseFrames(first.value!.toString('utf-8'))[0];
    expect(snapshotFrame.type).toBe('snapshot');

    // Register an agent while the stream is open
    const newAgent = built.registry.register({ name: 'dynamic' });

    // Read the next frame, which should be the agent:registered event
    const second = await iterator.next();
    const registeredFrames = parseSseFrames(second.value!.toString('utf-8'));
    const registeredFrame = registeredFrames[0];
    expect(registeredFrame.type).toBe('agent:registered');
    expect(registeredFrame.data).toEqual(newAgent);
    expect(registeredFrame.timestamp).toBeDefined();

    // Clean up the still-open stream
    await iterator.return?.();
    eventsRes.raw.res.req.emit('close');
  });

  it('returns 401 without auth (gate intact)', async () => {
    ({ app } = buildApp());
    const res = await app.inject({
      method: 'GET',
      url: '/events',
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /agents/:id/command', () => {
  let app: FastifyInstance | undefined;
  const auth = { authorization: `Bearer ${TOKEN}` };

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
    fs.rmSync(REGISTRY_FILE, { force: true });
  });

  it('returns 404 when the agent does not exist', async () => {
    ({ app } = buildApp());
    const res = await app.inject({
      method: 'POST',
      url: '/agents/00000000-0000-0000-0000-000000000000/command',
      headers: auth,
      payload: { command: 'restart' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Agent not found' });
  });

  it('returns 401 without auth (gate intact)', async () => {
    ({ app } = buildApp());
    const res = await app.inject({
      method: 'POST',
      url: '/agents/00000000-0000-0000-0000-000000000000/command',
      payload: { command: 'restart' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('broadcasts an agent:command frame to an open /events subscriber', async () => {
    const built = buildApp();
    app = built.app;
    const agent = built.registry.register({ name: 'target' });

    // Open a live /events connection: `payloadAsStream: true` resolves as
    // soon as headers are written (see light-my-request's Response#writeHead
    // override), handing back a still-open Readable we can keep reading
    // from as further frames are written, instead of waiting for the
    // connection to end (which, for this route, only happens on 'close').
    const eventsRes = await app.inject({
      method: 'GET',
      url: '/events',
      headers: auth,
      payloadAsStream: true,
    });
    const stream = eventsRes.stream();
    const iterator = stream[Symbol.asyncIterator]() as AsyncIterator<Buffer>;

    const first = await iterator.next();
    const snapshotFrame = parseSseFrames(first.value!.toString('utf-8'))[0];
    expect(snapshotFrame.type).toBe('snapshot');

    const commandRes = await app.inject({
      method: 'POST',
      url: `/agents/${agent.id}/command`,
      headers: auth,
      payload: { command: 'restart', args: ['--force'] },
    });
    expect(commandRes.statusCode).toBe(200);
    expect(commandRes.json()).toEqual({ ok: true });

    const second = await iterator.next();
    const commandFrame = parseSseFrames(second.value!.toString('utf-8'))[0];
    expect(commandFrame.type).toBe('agent:command');
    expect(commandFrame.data).toEqual({
      agentId: agent.id,
      command: 'restart',
      args: ['--force'],
    });

    // Clean up the still-open stream/connection so it doesn't leak the
    // route's keepalive interval past this test.
    await iterator.return?.();
    expect(eventsRes.raw.res.req).toBeDefined();
    eventsRes.raw.res.req.emit('close');
  });
});
