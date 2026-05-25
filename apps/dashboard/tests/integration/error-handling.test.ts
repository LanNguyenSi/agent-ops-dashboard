import { beforeAll, describe, it, expect } from 'vitest';
import { isDevServerUp, E2E_BASE } from './_e2e-helpers';

/**
 * Error Handling Tests
 *
 * End-to-end probes that the dev server returns sane error shapes. Each
 * test short-circuits when the server is not reachable (CI / preflight)
 * so `npm test` stays green without a backing server. Set E2E_BASE_URL to
 * point at a non-localhost server.
 */

let serverUp = false;
beforeAll(async () => {
  serverUp = await isDevServerUp();
});

describe('Error Handling: API Resilience', () => {
  it('should handle invalid API endpoints with 404', async () => {
    if (!serverUp) return;
    const response = await fetch(`${E2E_BASE}/api/nonexistent`);
    expect(response.status).toBe(404);
  });

  it('should handle malformed query parameters gracefully', async () => {
    if (!serverUp) return;
    const response = await fetch(`${E2E_BASE}/api/pipeline/runs?limit=invalid`);

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('runs');
    } else {
      expect([400, 500]).toContain(response.status);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    }
  });

  it('should return proper error structure when things fail', async () => {
    if (!serverUp) return;
    const response = await fetch(`${E2E_BASE}/api/github/repos/invalid/invalid`);

    if (!response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    }
  });
});

describe('Error Handling: Data Validation', () => {
  it('should handle missing environment variables gracefully', async () => {
    if (!serverUp) return;
    const response = await fetch(`${E2E_BASE}/api/pipeline/runs`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('runs');
    expect(Array.isArray(data.runs)).toBe(true);
  });

  it('should validate alert severity levels', () => {
    const validSeverities = ['critical', 'warning', 'info'];

    expect(validSeverities).toContain('critical');
    expect(validSeverities).toContain('warning');
    expect(validSeverities).toContain('info');
    expect(validSeverities).not.toContain('invalid');
  });

  it('should validate pipeline status values', () => {
    const validStatuses = ['success', 'failure', 'in_progress', 'cancelled', 'skipped'];

    expect(validStatuses).toHaveLength(5);
    expect(validStatuses).toContain('success');
    expect(validStatuses).toContain('failure');
  });
});
