import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { hasDatabase } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { registerStateRoutes } from './state/state.routes.js';
import { registerEventRoutes } from './events/event.routes.js';

export interface DbFeatureDeps {
  hasDatabase: () => boolean;
  runMigrations: () => Promise<unknown>;
}

const defaultDeps: DbFeatureDeps = { hasDatabase, runMigrations };

/**
 * Register the state store and activity feed routes.
 *
 * The event routes are always registered: without DATABASE_URL, or when the
 * migrations fail, the live SSE stream still has to answer instead of
 * returning 404. The state routes need a migrated database and are registered
 * only after the migrations succeed.
 */
export async function registerDbFeatures(
  fastify: FastifyInstance,
  preHandler?: preHandlerHookHandler,
  deps: DbFeatureDeps = defaultDeps,
): Promise<void> {
  if (deps.hasDatabase()) {
    try {
      await deps.runMigrations();
      registerStateRoutes(fastify, preHandler);
      console.log('[db] State store + Activity Feed routes registered');
    } catch (err) {
      console.error('[db] Failed to initialize DB features:', err);
      // Non-fatal: gateway still starts, with the event routes only.
    }
  } else {
    console.log('[db] DATABASE_URL not set, running in memory-only mode');
  }
  registerEventRoutes(fastify, preHandler);
}
