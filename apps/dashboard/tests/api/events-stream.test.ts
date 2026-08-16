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
});
