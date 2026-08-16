import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repos from '@/lib/github/repos';
import type { RepoHealth } from '@/lib/github/types';

// Happy-path companion to repo-health-errors.test.ts, which only pins the
// error-mapping contract.
vi.mock('@/lib/github/repos', () => ({
  getRepoHealth: vi.fn(),
}));

const mockGetRepoHealth = vi.mocked(repos.getRepoHealth);

const req = {} as Request;

describe('GET /api/github/repos/[owner]/[repo] — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the resolved repo health for the awaited route params', async () => {
    const health: RepoHealth = {
      owner: 'LanNguyenSi',
      repo: 'agent-ops-dashboard',
      full_name: 'LanNguyenSi/agent-ops-dashboard',
      default_branch: 'main',
      html_url: 'https://example.test/LanNguyenSi/agent-ops-dashboard',
      ci_status: 'success',
      open_pr_count: 2,
      failing_checks_count: 0,
      last_workflow_run: null,
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    mockGetRepoHealth.mockResolvedValue(health);
    const { GET } = await import('@/app/api/github/repos/[owner]/[repo]/route');

    const res = await GET(req, {
      params: Promise.resolve({ owner: 'LanNguyenSi', repo: 'agent-ops-dashboard' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(health);
    expect(mockGetRepoHealth).toHaveBeenCalledWith('LanNguyenSi', 'agent-ops-dashboard');
  });
});
