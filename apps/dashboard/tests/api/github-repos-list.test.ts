import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repos from '@/lib/github/repos';
import type { RepoHealth } from '@/lib/github/types';

// Only getAllRepos (the I/O boundary) is mocked; normalizeRepoQuery,
// applyRepoQuery, paginateRepos and resolveRepoOwner run for real so the
// test exercises the actual query/pagination logic the route relies on.
vi.mock('@/lib/github/repos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/github/repos')>();
  return {
    ...actual,
    getAllRepos: vi.fn(),
  };
});

const mockGetAllRepos = vi.mocked(repos.getAllRepos);

function repoFixture(overrides: Partial<RepoHealth>): RepoHealth {
  return {
    owner: 'acme',
    repo: 'x',
    full_name: 'acme/x',
    default_branch: 'main',
    html_url: 'https://example.test/acme/x',
    ci_status: 'success',
    open_pr_count: 0,
    failing_checks_count: 0,
    last_workflow_run: null,
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('GET /api/github/repos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the paginated, most-recently-updated-first repo list with meta', async () => {
    mockGetAllRepos.mockResolvedValue({
      repos: [
        repoFixture({ repo: 'a', updated_at: '2026-01-02T00:00:00.000Z' }),
        repoFixture({ repo: 'b', updated_at: '2026-01-01T00:00:00.000Z' }),
      ],
      errors: [],
      fetchedAt: '2026-01-03T00:00:00.000Z',
      cacheState: 'hit',
    });
    const { GET } = await import('@/app/api/github/repos/route');

    const res = await GET(new Request('http://localhost/api/github/repos?owner=acme&limit=1'));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.repos).toHaveLength(1);
    expect(data.repos[0].repo).toBe('a');
    expect(data.meta.total).toBe(2);
    expect(data.meta.filtered).toBe(2);
    expect(data.meta.returned).toBe(1);
    expect(data.meta.owner).toBe('acme');
    expect(mockGetAllRepos).toHaveBeenCalledWith('acme');
  });

  it('maps an invalid query param to a 400, not a 500, without calling getAllRepos', async () => {
    const { GET } = await import('@/app/api/github/repos/route');

    const res = await GET(new Request('http://localhost/api/github/repos?limit=999'));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid limit/);
    expect(mockGetAllRepos).not.toHaveBeenCalled();
  });

  it('returns 500 with the error message when getAllRepos throws', async () => {
    mockGetAllRepos.mockRejectedValue(new Error('cache backend unreachable'));
    const { GET } = await import('@/app/api/github/repos/route');

    const res = await GET(new Request('http://localhost/api/github/repos'));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'cache backend unreachable' });
  });
});
