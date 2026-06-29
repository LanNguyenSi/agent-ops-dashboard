import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for the server-side gateway client.
 *
 * GATEWAY_BASE_URL and GATEWAY_TOKEN are resolved at MODULE LOAD time, so each
 * case sets the env vars and then dynamically imports the module after a
 * vi.resetModules() so the new values take effect. global fetch is stubbed to
 * capture the composed URL + headers without hitting the network.
 */
describe('gateway/client', () => {
  const ORIG_ENV = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env = { ...ORIG_ENV };
    vi.unstubAllGlobals();
  });

  async function load(env: Record<string, string | undefined>) {
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    return import('@/lib/gateway/client');
  }

  it('attaches Authorization: Bearer <token> against the configured base URL', async () => {
    const { gatewayFetch } = await load({
      GATEWAY_TOKEN: 'secret-token',
      GATEWAY_INTERNAL_URL: 'http://gw:9999',
    });

    await gatewayFetch('/agents');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://gw:9999/agents');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer secret-token');
  });

  it('does NOT attach Authorization when the token is empty', async () => {
    const { gatewayFetch } = await load({
      GATEWAY_TOKEN: '',
      GATEWAY_INTERNAL_URL: 'http://gw:9999',
    });

    await gatewayFetch('/agents');

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).has('authorization')).toBe(false);
  });

  it('does not overwrite a caller-provided Authorization header', async () => {
    const { gatewayFetch } = await load({ GATEWAY_TOKEN: 'secret-token' });

    await gatewayFetch('/agents', { headers: { authorization: 'Bearer caller' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer caller');
  });

  it('falls back to the default base URL when GATEWAY_INTERNAL_URL is unset', async () => {
    const { gatewayFetch } = await load({
      GATEWAY_TOKEN: 'tok',
      GATEWAY_INTERNAL_URL: undefined,
    });

    await gatewayFetch('/health');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://agent-ops-gateway:3001/health');
  });

  it('gatewayAuthHeader reflects token presence', async () => {
    const withToken = await load({ GATEWAY_TOKEN: 'abc' });
    expect(withToken.gatewayAuthHeader()).toEqual({ authorization: 'Bearer abc' });

    vi.resetModules();
    const withoutToken = await load({ GATEWAY_TOKEN: '' });
    expect(withoutToken.gatewayAuthHeader()).toEqual({});
  });
});
