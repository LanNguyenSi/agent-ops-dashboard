import { beforeAll, describe, it, expect } from 'vitest';
import { isDevServerUp, E2E_BASE } from './_e2e-helpers';

/**
 * Error Handling Tests
 *
 * End-to-end probes that the dev server returns sane error shapes.
 * Server-dependent tests are reported as SKIPPED (not silently passed) when
 * no Next.js dev server is reachable. Set E2E_BASE_URL to point at a
 * non-localhost server.
 */

let serverUp = false;
beforeAll(async () => {
  serverUp = await isDevServerUp();
});

describe('Error Handling: API Resilience', () => {
  it('should handle invalid API endpoints with 404', async ({ skip }) => {
    if (!serverUp) skip();
    const response = await fetch(`${E2E_BASE}/api/nonexistent`);
    expect(response.status).toBe(404);
  });

  it('should handle malformed query parameters gracefully', async ({ skip }) => {
    if (!serverUp) skip();
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

  it('should return proper error structure when things fail', async ({ skip }) => {
    if (!serverUp) skip();
    const response = await fetch(`${E2E_BASE}/api/github/repos/invalid/invalid`);

    if (!response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    }
  });
});

describe('Error Handling: Data Validation', () => {
  it('should handle missing environment variables gracefully', async ({ skip }) => {
    if (!serverUp) skip();
    const response = await fetch(`${E2E_BASE}/api/pipeline/runs`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('runs');
    expect(Array.isArray(data.runs)).toBe(true);
  });
});
