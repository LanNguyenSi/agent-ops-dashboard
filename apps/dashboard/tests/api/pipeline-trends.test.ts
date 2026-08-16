import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pipelineService from '@/lib/pipeline/service';
import * as pipelineAnalytics from '@/lib/pipeline/analytics';
import type { PipelineRun, PipelineTrends } from '@/lib/pipeline/types';

vi.mock('@/lib/pipeline/service', () => ({
  getPipelineRuns: vi.fn(),
}));
vi.mock('@/lib/pipeline/analytics', () => ({
  calculateTrends: vi.fn(),
}));

const mockGetPipelineRuns = vi.mocked(pipelineService.getPipelineRuns);
const mockCalculateTrends = vi.mocked(pipelineAnalytics.calculateTrends);

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

const sampleTrends: PipelineTrends = {
  period: '30d',
  dataPoints: [],
  stats: {
    totalRuns: 1,
    successRuns: 1,
    failureRuns: 0,
    cancelledRuns: 0,
    successRate: 100,
    failureRate: 0,
    avgDuration: 300000,
  },
};

describe('GET /api/pipeline/trends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the requested period through and returns the calculated trends', async () => {
    mockGetPipelineRuns.mockResolvedValue([sampleRun]);
    mockCalculateTrends.mockReturnValue(sampleTrends);
    const { GET } = await import('@/app/api/pipeline/trends/route');

    const res = await GET(new Request('http://localhost/api/pipeline/trends?period=30d'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(sampleTrends);
    expect(mockGetPipelineRuns).toHaveBeenCalledWith({ limit: 200 });
    expect(mockCalculateTrends).toHaveBeenCalledWith([sampleRun], '30d');
  });

  it('defaults the period to 7d when not provided', async () => {
    mockGetPipelineRuns.mockResolvedValue([]);
    mockCalculateTrends.mockReturnValue({ ...sampleTrends, period: '7d' });
    const { GET } = await import('@/app/api/pipeline/trends/route');

    await GET(new Request('http://localhost/api/pipeline/trends'));

    expect(mockCalculateTrends).toHaveBeenCalledWith([], '7d');
  });

  it('returns 500 with the error message when getPipelineRuns throws', async () => {
    mockGetPipelineRuns.mockRejectedValue(new Error('db unreachable'));
    const { GET } = await import('@/app/api/pipeline/trends/route');

    const res = await GET(new Request('http://localhost/api/pipeline/trends'));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'db unreachable' });
  });
});
