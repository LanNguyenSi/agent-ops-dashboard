import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repos from '@/lib/github/repos';

// Pins the error-status contract of GET /api/github/repos/[owner]/[repo].
//
// The handler used to be `catch (error: any)` and read `error.status` /
// `error.message` off whatever was thrown. Replacing that with the
// isGitHubApiError type guard is only safe if all three shapes still map to
// the same response they did before: an octokit error keeps its status, a
// plain Error keeps its message (with a 500), and a non-object falls back to
// the generic message. A guard that is too wide OR too narrow silently
// regresses one of these, which is exactly the class of bug an unlinted,
// untested error path hides.
vi.mock('@/lib/github/repos', () => ({
  getRepoHealth: vi.fn(),
}));

const mockGetRepoHealth = vi.mocked(repos.getRepoHealth);

// The handler only awaits `params`; nothing else off the request is read.
const req = {} as Request;
const params = Promise.resolve({ owner: 'LanNguyenSi', repo: 'agent-ops-dashboard' });

async function callRoute() {
  const { GET } = await import('@/app/api/github/repos/[owner]/[repo]/route');
  return GET(req, { params });
}

/** An octokit-shaped error: a plain object carrying `status`. */
function octokitError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

describe('GET /api/github/repos/[owner]/[repo] — error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propagates an octokit 404 as a 404, not a 500', async () => {
    mockGetRepoHealth.mockRejectedValue(octokitError(404, 'Not Found'));

    const res = await callRoute();

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'Not Found' });
  });

  it('propagates an octokit 429 rate-limit status', async () => {
    mockGetRepoHealth.mockRejectedValue(octokitError(429, 'API rate limit exceeded'));

    const res = await callRoute();

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ error: 'API rate limit exceeded' });
  });

  it('maps a plain Error to 500 but still surfaces its message', async () => {
    mockGetRepoHealth.mockRejectedValue(new Error('Rate limited. Reset at ...'));

    const res = await callRoute();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Rate limited. Reset at ...' });
  });

  it('falls back to the generic message when a non-object is thrown', async () => {
    mockGetRepoHealth.mockRejectedValue('boom');

    const res = await callRoute();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Failed to fetch repo' });
  });
});
