import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export interface AuthConfig {
  token: string | undefined;
}

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const raw = env.GATEWAY_TOKEN;
  const token = typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
  return { token };
}

function extractBearer(req: FastifyRequest): string | null {
  const header = req.headers['authorization'];
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  return match[1].trim();
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function makeRequireAuth(config: AuthConfig) {
  return async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
    if (!config.token) {
      return reply.code(503).send({
        error: 'GATEWAY_TOKEN_NOT_CONFIGURED',
        message:
          'Gateway authentication is not configured. Set GATEWAY_TOKEN to enable this endpoint.',
      });
    }
    const presented = extractBearer(req);
    if (!presented || !constantTimeEqual(presented, config.token)) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
  };
}
