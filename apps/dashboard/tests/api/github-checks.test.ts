import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as checksLib from '@/lib/github/checks';
import type { CheckRun } from '@/lib/github/types';

vi.mock('@/lib/github/checks', () => ({
  getFailingChecks: vi.fn(),
}));

const mockGetFailingChecks = vi.mocked(checksLib.getFailingChecks);
const ORIGINAL_REPOS_ENV = process.env.GITHUB_REPOS;

const failingCheck: CheckRun = {
  id: 1,
  name: 'build',
  status: 'completed',
  conclusion: 'failure',
  html_url: 'https://example.test/checks/1',
  started_at: null,
  completed_at: null,
};

describe('GET /api/github/checks', () => {
  // No test exercises the outer catch's non-Error-message fallback: every
  // per-repo lookup goes through Promise.allSettled, which never rejects,
  // so that catch is structurally unreachable in this handler.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_REPOS_ENV === undefined) delete process.env.GITHUB_REPOS;
    else process.env.GITHUB_REPOS = ORIGINAL_REPOS_ENV;
  });

  it('returns 500 when GITHUB_REPOS is not set', async () => {
    delete process.env.GITHUB_REPOS;
    const { GET } = await import('@/app/api/github/checks/route');

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: 'GITHUB_REPOS environment variable not set',
    });
    expect(mockGetFailingChecks).not.toHaveBeenCalled();
  });

  it('aggregates failing checks across configured repos, tagged with owner/repo', async () => {
    process.env.GITHUB_REPOS = 'acme/one, acme/two';
    mockGetFailingChecks.mockResolvedValueOnce([failingCheck]).mockResolvedValueOnce([]);
    const { GET } = await import('@/app/api/github/checks/route');

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      checks: [{ ...failingCheck, owner: 'acme', repo: 'one' }],
    });
    expect(mockGetFailingChecks).toHaveBeenNthCalledWith(1, 'acme', 'one');
    expect(mockGetFailingChecks).toHaveBeenNthCalledWith(2, 'acme', 'two');
  });

  it('drops a repo whose lookup rejects instead of failing the whole request', async () => {
    process.env.GITHUB_REPOS = 'acme/one,acme/two';
    mockGetFailingChecks
      .mockRejectedValueOnce(new Error('404 Not Found'))
      .mockResolvedValueOnce([failingCheck]);
    const { GET } = await import('@/app/api/github/checks/route');

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      checks: [{ ...failingCheck, owner: 'acme', repo: 'two' }],
    });
  });
});
