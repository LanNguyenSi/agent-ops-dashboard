import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as gatewayClient from '@/lib/gateway/client';

vi.mock('@/lib/gateway/client', () => ({
  gatewayFetch: vi.fn(),
}));

const mockGatewayFetch = vi.mocked(gatewayClient.gatewayFetch);

function makeUpstream(opts: {
  ok: boolean;
  status: number;
  contentType?: string;
  body?: string;
}): Response {
  const body = opts.body
    ? new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(opts.body));
          controller.close();
        },
      })
    : null;

  return {
    ok: opts.ok,
    status: opts.status,
    headers: new Headers(opts.contentType ? { 'content-type': opts.contentType } : {}),
    body,
  } as unknown as Response;
}

describe('GET /api/gateway/events/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards agentId/eventType query params and the last-event-id header, and proxies SSE headers', async () => {
    const { GET } = await import('@/app/api/gateway/events/stream/route');
    mockGatewayFetch.mockResolvedValue(makeUpstream({ ok: true, status: 200 }));

    const req = new Request(
      'http://localhost/api/gateway/events/stream?agentId=a1&eventType=heartbeat',
      { headers: { 'last-event-id': '42' } },
    );

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
    expect(res.headers.get('X-Accel-Buffering')).toBe('no');
    expect(mockGatewayFetch).toHaveBeenCalledWith(
      '/api/events/stream?agentId=a1&eventType=heartbeat',
      expect.objectContaining({ headers: { 'last-event-id': '42' } }),
    );
  });

  it('omits the query string and last-event-id header when neither is present', async () => {
    const { GET } = await import('@/app/api/gateway/events/stream/route');
    mockGatewayFetch.mockResolvedValue(makeUpstream({ ok: true, status: 200 }));

    const req = new Request('http://localhost/api/gateway/events/stream');

    await GET(req);

    expect(mockGatewayFetch).toHaveBeenCalledWith(
      '/api/events/stream',
      expect.objectContaining({ headers: {} }),
    );
  });

  it('forwards the upstream status/content-type/body as-is when the upstream refuses', async () => {
    const { GET } = await import('@/app/api/gateway/events/stream/route');
    mockGatewayFetch.mockResolvedValue(
      makeUpstream({
        ok: false,
        status: 401,
        contentType: 'application/json',
        body: '{"error":"unauthorized"}',
      }),
    );

    const req = new Request('http://localhost/api/gateway/events/stream');
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    await expect(res.text()).resolves.toBe('{"error":"unauthorized"}');
  });

  it('maps the ?cursor= query param (sent by the activity hook) to the last-event-id header', async () => {
    const { GET } = await import('@/app/api/gateway/events/stream/route');
    mockGatewayFetch.mockResolvedValue(makeUpstream({ ok: true, status: 200 }));

    const req = new Request('http://localhost/api/gateway/events/stream?agentId=a1&cursor=77');
    await GET(req);

    expect(mockGatewayFetch).toHaveBeenCalledWith(
      '/api/events/stream?agentId=a1',
      expect.objectContaining({ headers: { 'last-event-id': '77' } }),
    );
  });

  it('prefers a real Last-Event-ID header over the cursor param', async () => {
    const { GET } = await import('@/app/api/gateway/events/stream/route');
    mockGatewayFetch.mockResolvedValue(makeUpstream({ ok: true, status: 200 }));

    const req = new Request('http://localhost/api/gateway/events/stream?cursor=77', {
      headers: { 'last-event-id': '90' },
    });
    await GET(req);

    expect(mockGatewayFetch).toHaveBeenCalledWith(
      '/api/events/stream',
      expect.objectContaining({ headers: { 'last-event-id': '90' } }),
    );
  });

  it('ignores a non-numeric cursor', async () => {
    const { GET } = await import('@/app/api/gateway/events/stream/route');
    mockGatewayFetch.mockResolvedValue(makeUpstream({ ok: true, status: 200 }));

    const req = new Request('http://localhost/api/gateway/events/stream?cursor=abc');
    await GET(req);

    expect(mockGatewayFetch).toHaveBeenCalledWith(
      '/api/events/stream',
      expect.objectContaining({ headers: {} }),
    );
  });

  it('answers 502 with a JSON error when the gateway is unreachable', async () => {
    const { GET } = await import('@/app/api/gateway/events/stream/route');
    mockGatewayFetch.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const res = await GET(new Request('http://localhost/api/gateway/events/stream'));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: 'connect ECONNREFUSED' });
  });

  it('falls back to a generic message when a non-Error is thrown', async () => {
    const { GET } = await import('@/app/api/gateway/events/stream/route');
    mockGatewayFetch.mockRejectedValue('boom');

    const res = await GET(new Request('http://localhost/api/gateway/events/stream'));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: 'Gateway unreachable' });
  });
});
