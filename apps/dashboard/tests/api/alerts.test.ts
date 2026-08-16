import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as alertsService from '@/lib/alerts/service';
import type { Alert, AlertStats } from '@/lib/alerts/types';

vi.mock('@/lib/alerts/service', () => ({
  getAlerts: vi.fn(),
  getStats: vi.fn(),
}));

const mockGetAlerts = vi.mocked(alertsService.getAlerts);
const mockGetStats = vi.mocked(alertsService.getStats);

const sampleAlert: Alert = {
  id: 'a1',
  severity: 'warning',
  status: 'active',
  title: 'CI flaky',
  message: 'build retried 3x',
  source: 'pipeline',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const sampleStats: AlertStats = { total: 1, active: 1, acknowledged: 0, resolved: 0 };

function makeReq(url: string): Request {
  return new Request(url);
}

describe('GET /api/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns alerts without stats by default', async () => {
    const { GET } = await import('@/app/api/alerts/route');
    mockGetAlerts.mockResolvedValue([sampleAlert]);

    const res = await GET(makeReq('http://localhost/api/alerts'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ alerts: [sampleAlert] });
    expect(mockGetStats).not.toHaveBeenCalled();
  });

  it('includes stats when includeStats=true', async () => {
    const { GET } = await import('@/app/api/alerts/route');
    mockGetAlerts.mockResolvedValue([sampleAlert]);
    mockGetStats.mockResolvedValue(sampleStats);

    const res = await GET(makeReq('http://localhost/api/alerts?includeStats=true'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ alerts: [sampleAlert], stats: sampleStats });
  });

  it('returns 500 with the error message when getAlerts throws', async () => {
    const { GET } = await import('@/app/api/alerts/route');
    mockGetAlerts.mockRejectedValue(new Error('db down'));

    const res = await GET(makeReq('http://localhost/api/alerts'));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'db down' });
  });
});
