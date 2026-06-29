import { beforeAll, describe, it, expect } from 'vitest';
import { isDevServerUp, E2E_BASE } from '../integration/_e2e-helpers';

/**
 * Contract Tests
 *
 * Boundary contract probes against the dev server. Each server-dependent
 * test is reported as SKIPPED (not silently passed) when the Next.js dev
 * server is not reachable. Set E2E_BASE_URL to point elsewhere.
 */

let serverUp = false;
beforeAll(async () => {
  serverUp = await isDevServerUp();
});

describe('Contract: API Response Structures', () => {
  it('should maintain stable agents API contract', async ({ skip }) => {
    if (!serverUp) skip();
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
      expect(agent).toHaveProperty('lastMessage');

      expect(typeof agent.id).toBe('string');
      expect(typeof agent.name).toBe('string');
      expect(['online', 'offline']).toContain(agent.status);
    }
  });

  it('should maintain stable pipeline API contract', async ({ skip }) => {
    if (!serverUp) skip();
    const response = await fetch(`${E2E_BASE}/api/pipeline/runs`);
    expect(response.ok).toBe(true);

    const data = await response.json();

    expect(data).toHaveProperty('runs');
    expect(Array.isArray(data.runs)).toBe(true);

    if (data.runs.length > 0) {
      const run = data.runs[0];

      expect(run).toHaveProperty('id');
      expect(run).toHaveProperty('status');
      expect(run).toHaveProperty('repository');
      expect(run).toHaveProperty('branch');
      expect(run).toHaveProperty('commit');

      expect(typeof run.id).toBe('number');
      expect(typeof run.repository).toBe('string');
      expect(['success', 'failure', 'in_progress', 'cancelled', 'skipped']).toContain(run.status);
    }
  });

  it('should maintain stable alerts API contract', async ({ skip }) => {
    if (!serverUp) skip();
    const response = await fetch(`${E2E_BASE}/api/alerts`);
    expect(response.ok).toBe(true);

    const data = await response.json();

    expect(data).toHaveProperty('alerts');
    expect(Array.isArray(data.alerts)).toBe(true);

    if (data.alerts.length > 0) {
      const alert = data.alerts[0];

      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('status');
      expect(alert).toHaveProperty('title');
      expect(alert).toHaveProperty('message');

      expect(typeof alert.id).toBe('string');
      expect(['critical', 'warning', 'info']).toContain(alert.severity);
      expect(['active', 'acknowledged', 'resolved']).toContain(alert.status);
    }
  });
});

describe('Contract: GitHub Integration', () => {
  it('should handle GitHub API response structure', async ({ skip }) => {
    if (!serverUp) skip();
    const response = await fetch(`${E2E_BASE}/api/pipeline/runs?limit=1`);

    if (response.ok) {
      const data = await response.json();

      if (data.runs.length > 0) {
        const run = data.runs[0];

        expect(run).toHaveProperty('htmlUrl');
        expect(run).toHaveProperty('startedAt');
        expect(run).toHaveProperty('completedAt');

        if (run.htmlUrl) {
          expect(run.htmlUrl).toMatch(/^https:\/\/github\.com\//);
        }
      }
    }
  });
});
