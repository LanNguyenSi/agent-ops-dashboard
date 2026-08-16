import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pipelineService from '@/lib/pipeline/service';
import type { PipelineRun } from '@/lib/pipeline/types';

vi.mock('@/lib/pipeline/service', () => ({
  getPipelineRuns: vi.fn(),
}));

const mockGetPipelineRuns = vi.mocked(pipelineService.getPipelineRuns);

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

describe('GET /api/pipeline/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses query filters and returns the runs', async () => {
    mockGetPipelineRuns.mockResolvedValue([sampleRun]);
    const { GET } = await import('@/app/api/pipeline/runs/route');

    const res = await GET(
      new Request(
        'http://localhost/api/pipeline/runs?repository=acme/x&branch=main&status=success&startDate=2026-01-01&endDate=2026-01-02&limit=10',
      ),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ runs: [sampleRun] });
    expect(mockGetPipelineRuns).toHaveBeenCalledWith({
      repository: 'acme/x',
      branch: 'main',
      status: 'success',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      limit: 10,
    });
  });

  it('defaults limit to 50 and leaves unset filters undefined', async () => {
    mockGetPipelineRuns.mockResolvedValue([]);
    const { GET } = await import('@/app/api/pipeline/runs/route');

    await GET(new Request('http://localhost/api/pipeline/runs'));

    expect(mockGetPipelineRuns).toHaveBeenCalledWith({
      repository: undefined,
      branch: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined,
      limit: 50,
    });
  });

  it('returns 500 with the error message when getPipelineRuns throws', async () => {
    mockGetPipelineRuns.mockRejectedValue(new Error('db unreachable'));
    const { GET } = await import('@/app/api/pipeline/runs/route');

    const res = await GET(new Request('http://localhost/api/pipeline/runs'));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'db unreachable' });
  });
});
