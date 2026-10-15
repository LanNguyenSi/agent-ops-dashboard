import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerStateRoutes = vi.fn();
const registerEventRoutes = vi.fn();

vi.mock('../state/state.routes.js', () => ({
  registerStateRoutes: (...args: unknown[]) => registerStateRoutes(...args),
}));
vi.mock('../events/event.routes.js', () => ({
  registerEventRoutes: (...args: unknown[]) => registerEventRoutes(...args),
}));
vi.mock('../db/pool.js', () => ({ hasDatabase: () => false }));
vi.mock('../db/migrate.js', () => ({ runMigrations: vi.fn() }));

import { registerDbFeatures } from '../db-features.js';

const fastify = {} as never;
const guard = vi.fn() as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('registerDbFeatures', () => {
  it('registers both state and event routes after a successful migration', async () => {
    const runMigrations = vi.fn().mockResolvedValue(undefined);
    await registerDbFeatures(fastify, guard, { hasDatabase: () => true, runMigrations });

    expect(runMigrations).toHaveBeenCalledOnce();
    expect(registerStateRoutes).toHaveBeenCalledWith(fastify, guard);
    expect(registerEventRoutes).toHaveBeenCalledOnce();
    expect(registerEventRoutes).toHaveBeenCalledWith(fastify, guard);
  });

  it('still registers the event routes (not the state routes) when the migration fails', async () => {
    const runMigrations = vi.fn().mockRejectedValue(new Error('boom'));
    await registerDbFeatures(fastify, guard, { hasDatabase: () => true, runMigrations });

    expect(registerStateRoutes).not.toHaveBeenCalled();
    expect(registerEventRoutes).toHaveBeenCalledOnce();
    expect(registerEventRoutes).toHaveBeenCalledWith(fastify, guard);
  });

  it('registers only the event routes and skips migrations without a database', async () => {
    const runMigrations = vi.fn();
    await registerDbFeatures(fastify, guard, { hasDatabase: () => false, runMigrations });

    expect(runMigrations).not.toHaveBeenCalled();
    expect(registerStateRoutes).not.toHaveBeenCalled();
    expect(registerEventRoutes).toHaveBeenCalledOnce();
  });
});
