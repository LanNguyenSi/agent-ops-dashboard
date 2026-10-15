import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agentsClient from '@/lib/agents/client';
import { AgentSourceError, AgentSourceNotConfiguredError } from '@/lib/agents/client';
import type { AgentActivity } from '@/lib/agents/types';

vi.mock('@/lib/agents/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/agents/client')>('@/lib/agents/client');
  return { ...actual, getAgentActivity: vi.fn() };
});

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

  it('returns 503 with code NOT_CONFIGURED when no agent source is configured', async () => {
    const { GET } = await import('@/app/api/agents/route');
    mockGetAgentActivity.mockRejectedValue(new AgentSourceNotConfiguredError());

    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('NOT_CONFIGURED');
    expect(body.error).toContain('TRIOLOGUE_HEALTH_URL');
    expect(body).not.toHaveProperty('agents');
  });

  it('returns 502 with code UPSTREAM_FAILED when the configured source fails', async () => {
    const { GET } = await import('@/app/api/agents/route');
    mockGetAgentActivity.mockRejectedValue(new AgentSourceError('Triologue API responded with 500'));

    const res = await GET();

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: 'Triologue API responded with 500',
      code: 'UPSTREAM_FAILED',
    });
  });
});
