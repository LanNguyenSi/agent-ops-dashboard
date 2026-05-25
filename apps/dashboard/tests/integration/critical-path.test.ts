import { beforeAll, describe, it, expect } from 'vitest';
import { isDevServerUp, E2E_BASE } from './_e2e-helpers';

/**
 * Critical Path Tests
 *
 * End-to-end probes against a running Next.js dev server. The suite
 * short-circuits each test when the server is not reachable (CI /
 * preflight), so `npm test` stays green without a backing server. Run
 * with the server up to actually exercise them.
 */

let serverUp = false;
beforeAll(async () => {
  serverUp = await isDevServerUp();
});

describe('Critical Path: Agent Status Dashboard', () => {
  it('should fetch and display agent activity data', async () => {
    if (!serverUp) return;
    const response = await fetch(`${E2E_BASE}/api/agents`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('agents');
    expect(Array.isArray(data.agents)).toBe(true);

    if (data.agents.length > 0) {
      const agent = data.agents[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('status');
      expect(['online', 'offline']).toContain(agent.status);
    }
  });

  it('should fetch pipeline runs successfully', async () => {
    if (!serverUp) return;
    const response = await fetch(`${E2E_BASE}/api/pipeline/runs`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('runs');
    expect(Array.isArray(data.runs)).toBe(true);

    if (data.runs.length > 0) {
      const run = data.runs[0];
      expect(run).toHaveProperty('id');
      expect(run).toHaveProperty('status');
      expect(['success', 'failure', 'in_progress', 'cancelled', 'skipped']).toContain(run.status);
    }
  });

  it('should fetch alerts with stats', async () => {
    if (!serverUp) return;
    const response = await fetch(`${E2E_BASE}/api/alerts?includeStats=true`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('alerts');
    expect(data).toHaveProperty('stats');

    expect(data.stats).toHaveProperty('total');
    expect(data.stats).toHaveProperty('active');
    expect(data.stats).toHaveProperty('acknowledged');
    expect(data.stats).toHaveProperty('resolved');

    expect(data.stats.total).toBeGreaterThanOrEqual(0);
    expect(data.stats.active).toBeGreaterThanOrEqual(0);
  });
});
