import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pipelineService from '@/lib/pipeline/service';
import * as pipelineAnalytics from '@/lib/pipeline/analytics';
import type { PipelineRun, PipelineStats } from '@/lib/pipeline/types';

vi.mock('@/lib/pipeline/service', () => ({
  getPipelineRuns: vi.fn(),
}));
vi.mock('@/lib/pipeline/analytics', () => ({
  calculateStats: vi.fn(),
}));

const mockGetPipelineRuns = vi.mocked(pipelineService.getPipelineRuns);
const mockCalculateStats = vi.mocked(pipelineAnalytics.calculateStats);

const sampleRun: PipelineRun = {
  id: 1,
  name: 'CI',
  status: 'success',
  conclusion: 'success',
  repository: 'acme/x',
  branch: 'main',
  commit: 'abc123',
  commitMessage: 'fix: thing',
  author: 'octocat',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:05:00.000Z',
  duration: 300000,
  htmlUrl: 'https://example.test/run/1',
};

const sampleStats: PipelineStats = {
  totalRuns: 1,
  successRuns: 1,
  failureRuns: 0,
  cancelledRuns: 0,
  successRate: 100,
  failureRate: 0,
  avgDuration: 300000,
};

describe('GET /api/pipeline/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches up to 100 runs and returns the calculated stats', async () => {
    mockGetPipelineRuns.mockResolvedValue([sampleRun]);
    mockCalculateStats.mockReturnValue(sampleStats);
    const { GET } = await import('@/app/api/pipeline/stats/route');

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(sampleStats);
    expect(mockGetPipelineRuns).toHaveBeenCalledWith({ limit: 100 });
    expect(mockCalculateStats).toHaveBeenCalledWith([sampleRun]);
  });

  it('returns 500 with the error message when getPipelineRuns throws', async () => {
    mockGetPipelineRuns.mockRejectedValue(new Error('db unreachable'));
    const { GET } = await import('@/app/api/pipeline/stats/route');

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'db unreachable' });
    expect(mockCalculateStats).not.toHaveBeenCalled();
  });
});
