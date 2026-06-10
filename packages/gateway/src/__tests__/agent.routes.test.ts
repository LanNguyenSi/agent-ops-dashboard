import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Point the registry's persistence at a throwaway tmp file so the suite never
// reads or writes the real agent-registry.json in the package dir. Set before
// the registry module is imported (PERSIST_FILE is resolved at module load),
// hence the dynamic imports in beforeAll.
const REGISTRY_FILE = path.join(os.tmpdir(), `agent-registry-test-${process.pid}.json`);
const TOKEN = 'test-gateway-token';

let registerAgentRoutes: typeof import('../agent.routes.js').registerAgentRoutes;
let AgentRegistry: typeof import('../registry.js').AgentRegistry;
let makeRequireAuth: typeof import('../auth/auth.js').makeRequireAuth;
let loadAuthConfig: typeof import('../auth/auth.js').loadAuthConfig;

beforeAll(async () => {
  process.env.REGISTRY_FILE = REGISTRY_FILE;
  ({ registerAgentRoutes } = await import('../agent.routes.js'));
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
  registerAgentRoutes(app, registry, requireAuth);
  return { app, registry };
}

describe('DELETE /agents/:id', () => {
  let app: FastifyInstance | undefined;
  const auth = { authorization: `Bearer ${TOKEN}` };

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
    fs.rmSync(REGISTRY_FILE, { force: true });
  });

  it('returns 404 (not 200) when the agent does not exist', async () => {
    ({ app } = buildApp());
    const res = await app.inject({
      method: 'DELETE',
      url: '/agents/00000000-0000-0000-0000-000000000000',
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Agent not found' });
  });

  it('returns 200 + { ok: true } when the agent exists (behaviour preserved)', async () => {
    const built = buildApp();
    app = built.app;
    const agent = built.registry.register({ name: 'tester' });
    const res = await app.inject({
      method: 'DELETE',
      url: `/agents/${agent.id}`,
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('returns 401 without auth (gate intact)', async () => {
    ({ app } = buildApp());
    const res = await app.inject({
      method: 'DELETE',
      url: '/agents/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(401);
  });
});
