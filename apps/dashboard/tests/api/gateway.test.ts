import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as gatewayClient from '@/lib/gateway/client';

// vi.mock must be at module scope; vitest hoists it before imports
vi.mock('@/lib/gateway/client', () => ({
  gatewayFetch: vi.fn(),
  gatewayAuthHeader: vi.fn().mockReturnValue({}),
  GATEWAY_BASE_URL: 'http://test-gateway:3001',
}));

const mockGatewayFetch = vi.mocked(gatewayClient.gatewayFetch);

// ---------------------------------------------------------------------------
// Helpers: minimal request mocks.
// NextRequest requires a full URL + global fetch (Node 18+) but behaves
// inconsistently under vitest/jsdom for body.json(). We use typed plain-object
// mocks exposing only what each handler actually reads.
// ---------------------------------------------------------------------------
function makeRegisterReq(body: unknown = { name: 'Agent1', platform: 'linux' }) {
  return { json: async () => body } as any;
}

function makeHeartbeatReq(id: string | null, body: unknown = {}) {
  return {
    nextUrl: { searchParams: new URLSearchParams(id ? `id=${id}` : '') },
    json: async () => body,
  } as any;
}

describe('Gateway: POST /api/gateway/agents/register', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('proxies body to gateway and returns gateway status on success', async () => {
    const { POST } = await import('@/app/api/gateway/agents/register/route');
    const responsePayload = { id: 'a1', name: 'Agent1' };
    mockGatewayFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => responsePayload,
    } as any);

    const res = await POST(makeRegisterReq({ name: 'Agent1', platform: 'linux' }));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe('a1');
    expect(mockGatewayFetch).toHaveBeenCalledWith(
      '/agents/register',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns 502 with error message when gatewayFetch throws', async () => {
    const { POST } = await import('@/app/api/gateway/agents/register/route');
    mockGatewayFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await POST(makeRegisterReq());

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data).toEqual({ error: 'Gateway unreachable' });
  });
});

describe('Gateway: POST /api/gateway/agents/heartbeat', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 when id query param is missing', async () => {
    const { POST } = await import('@/app/api/gateway/agents/heartbeat/route');

    const res = await POST(makeHeartbeatReq(null));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'id required' });
    expect(mockGatewayFetch).not.toHaveBeenCalled();
  });

  it('proxies to /agents/{id}/heartbeat and passes through gateway status', async () => {
    const { POST } = await import('@/app/api/gateway/agents/heartbeat/route');
    mockGatewayFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as any);

    const res = await POST(makeHeartbeatReq('agent-42', { ts: 1234567890 }));

    expect(res.status).toBe(200);
    expect(mockGatewayFetch).toHaveBeenCalledWith(
      '/agents/agent-42/heartbeat',
      expect.any(Object),
    );
  });

  it('returns 502 when gatewayFetch throws', async () => {
    const { POST } = await import('@/app/api/gateway/agents/heartbeat/route');
    mockGatewayFetch.mockRejectedValue(new Error('Network error'));

    const res = await POST(makeHeartbeatReq('agent-42'));

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data).toEqual({ error: 'Gateway unreachable' });
  });
});

describe('Gateway: GET /api/gateway/agents', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns agents array when gateway responds ok', async () => {
    const { GET } = await import('@/app/api/gateway/agents/route');
    const agents = [{ id: 'a1', name: 'Hermes' }, { id: 'a2', name: 'Apollo' }];
    mockGatewayFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => agents,
    } as any);

    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(agents);
  });

  it('returns 502 when gateway responds with non-ok status', async () => {
    const { GET } = await import('@/app/api/gateway/agents/route');
    mockGatewayFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service Unavailable' }),
    } as any);

    const res = await GET();

    expect(res.status).toBe(502);
    const body = await res.json();
    // error message includes the status code from the gateway
    expect(body.error).toMatch(/503/);
  });

  it('returns 502 when gatewayFetch throws', async () => {
    const { GET } = await import('@/app/api/gateway/agents/route');
    mockGatewayFetch.mockRejectedValue(new Error('DNS resolution failed'));

    const res = await GET();

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
