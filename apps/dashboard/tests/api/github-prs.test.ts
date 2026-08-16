import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as prsLib from '@/lib/github/prs';
import type { PullRequest } from '@/lib/github/types';

vi.mock('@/lib/github/prs', () => ({
  getOpenPRs: vi.fn(),
}));

const mockGetOpenPRs = vi.mocked(prsLib.getOpenPRs);
const ORIGINAL_REPOS_ENV = process.env.GITHUB_REPOS;

const openPr: PullRequest = {
  number: 7,
  title: 'Add feature',
  html_url: 'https://example.test/pr/7',
  state: 'open',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  user: { login: 'octocat', avatar_url: 'https://example.test/a.png' },
  head: { ref: 'feature', sha: 'abc123' },
  base: { ref: 'main' },
  draft: false,
};

describe('GET /api/github/prs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_REPOS_ENV === undefined) delete process.env.GITHUB_REPOS;
    else process.env.GITHUB_REPOS = ORIGINAL_REPOS_ENV;
  });

  it('returns 500 when GITHUB_REPOS is not set', async () => {
    delete process.env.GITHUB_REPOS;
    const { GET } = await import('@/app/api/github/prs/route');

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: 'GITHUB_REPOS environment variable not set',
    });
    expect(mockGetOpenPRs).not.toHaveBeenCalled();
  });

  it('aggregates open PRs across configured repos, tagged with owner/repo', async () => {
    process.env.GITHUB_REPOS = 'acme/one, acme/two';
    mockGetOpenPRs.mockResolvedValueOnce([openPr]).mockResolvedValueOnce([]);
    const { GET } = await import('@/app/api/github/prs/route');

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      prs: [{ ...openPr, owner: 'acme', repo: 'one' }],
    });
    expect(mockGetOpenPRs).toHaveBeenNthCalledWith(1, 'acme', 'one');
    expect(mockGetOpenPRs).toHaveBeenNthCalledWith(2, 'acme', 'two');
  });

  it('drops a repo whose lookup rejects instead of failing the whole request', async () => {
    process.env.GITHUB_REPOS = 'acme/one,acme/two';
    mockGetOpenPRs
      .mockRejectedValueOnce(new Error('404 Not Found'))
      .mockResolvedValueOnce([openPr]);
    const { GET } = await import('@/app/api/github/prs/route');

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      prs: [{ ...openPr, owner: 'acme', repo: 'two' }],
    });
  });
});
