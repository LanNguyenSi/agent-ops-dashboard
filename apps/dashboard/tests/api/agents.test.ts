import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agentsClient from '@/lib/agents/client';
import type { AgentActivity } from '@/lib/agents/types';

vi.mock('@/lib/agents/client', () => ({
  getAgentActivity: vi.fn(),
}));

const mockGetAgentActivity = vi.mocked(agentsClient.getAgentActivity);

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns agent activity on success', async () => {
    const { GET } = await import('@/app/api/agents/route');
    const activity: AgentActivity = {
      agents: [],
      totalAgents: 0,
      onlineAgents: 0,
      offlineAgents: 0,
      lastUpdate: '2026-01-01T00:00:00.000Z',
    };
    mockGetAgentActivity.mockResolvedValue(activity);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(activity);
  });

  it('returns 500 with the error message when getAgentActivity throws', async () => {
    const { GET } = await import('@/app/api/agents/route');
    mockGetAgentActivity.mockRejectedValue(new Error('upstream down'));

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'upstream down' });
  });

  it('falls back to the generic message when a non-Error is thrown', async () => {
    const { GET } = await import('@/app/api/agents/route');
    mockGetAgentActivity.mockRejectedValue('boom');

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Failed to fetch agent activity' });
  });
});
