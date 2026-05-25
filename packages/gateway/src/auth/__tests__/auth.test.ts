import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAuthConfig, makeRequireAuth } from '../auth.js';
import { loadAllowedOrigins } from '../cors.js';

function buildApp(token: string | undefined): FastifyInstance {
  const env = token === undefined ? {} : { GATEWAY_TOKEN: token };
  const requireAuth = makeRequireAuth(loadAuthConfig(env as NodeJS.ProcessEnv));
  const app = Fastify();
  app.get('/health', async () => ({ ok: true }));
  app.get('/guarded', { preHandler: requireAuth }, async () => ({ ok: true }));
  app.delete('/guarded/:id', { preHandler: requireAuth }, async () => ({ deleted: true }));
  return app;
}

describe('gateway auth middleware', () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  describe('GATEWAY_TOKEN not configured', () => {
    beforeEach(() => {
      app = buildApp(undefined);
    });

    it('public routes still respond', async () => {
      const res = await app!.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
    });

    it('/health stays open in 503-mode (never accidentally gated)', async () => {
      const res = await app!.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    });

    it('guarded routes return 503 — loud-fail', async () => {
      const res = await app!.inject({ method: 'GET', url: '/guarded' });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe('GATEWAY_TOKEN_NOT_CONFIGURED');
    });

    it('503 fires even when a token header is presented', async () => {
      const res = await app!.inject({
        method: 'DELETE',
        url: '/guarded/abc',
        headers: { authorization: 'Bearer anything' },
      });
      expect(res.statusCode).toBe(503);
    });
  });

  describe('GATEWAY_TOKEN configured', () => {
    beforeEach(() => {
      app = buildApp('s3cret-token-value');
    });

    it('missing Authorization → 401', async () => {
      const res = await app!.inject({ method: 'GET', url: '/guarded' });
      expect(res.statusCode).toBe(401);
      expect(res.json().error).toBe('UNAUTHORIZED');
    });

    it('non-Bearer scheme → 401', async () => {
      const res = await app!.inject({
        method: 'GET',
        url: '/guarded',
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('wrong token → 401', async () => {
      const res = await app!.inject({
        method: 'GET',
        url: '/guarded',
        headers: { authorization: 'Bearer wrong' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('correct token → 200', async () => {
      const res = await app!.inject({
        method: 'GET',
        url: '/guarded',
        headers: { authorization: 'Bearer s3cret-token-value' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    });

    it('mutating route DELETE behaves the same', async () => {
      const res = await app!.inject({
        method: 'DELETE',
        url: '/guarded/abc',
        headers: { authorization: 'Bearer s3cret-token-value' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('public /health stays open even when token configured', async () => {
      const res = await app!.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('token whitespace handling', () => {
    it('blank-string GATEWAY_TOKEN treated as unconfigured', () => {
      const cfg = loadAuthConfig({ GATEWAY_TOKEN: '   ' } as NodeJS.ProcessEnv);
      expect(cfg.token).toBeUndefined();
    });

    it('surrounding whitespace stripped from configured token', async () => {
      app = buildApp(' padded-token ');
      const res = await app!.inject({
        method: 'GET',
        url: '/guarded',
        headers: { authorization: 'Bearer padded-token' },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});

describe('CORS allowlist', () => {
  it('defaults to localhost only when env unset', () => {
    expect(loadAllowedOrigins({} as NodeJS.ProcessEnv)).toEqual(['http://localhost:3000']);
  });

  it('parses comma-separated GATEWAY_ALLOWED_ORIGINS', () => {
    const origins = loadAllowedOrigins({
      GATEWAY_ALLOWED_ORIGINS: 'https://ops.opentriologue.ai, http://localhost:3000',
    } as NodeJS.ProcessEnv);
    expect(origins).toEqual(['https://ops.opentriologue.ai', 'http://localhost:3000']);
  });

  it('drops empty entries', () => {
    const origins = loadAllowedOrigins({
      GATEWAY_ALLOWED_ORIGINS: 'https://ops.opentriologue.ai,, ,',
    } as NodeJS.ProcessEnv);
    expect(origins).toEqual(['https://ops.opentriologue.ai']);
  });
});
