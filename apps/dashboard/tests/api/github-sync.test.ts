import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cacheLib from '@/lib/github/cache';

vi.mock('@/lib/github/cache', () => ({
  clearTtlCache: vi.fn(),
}));

const mockClearTtlCache = vi.mocked(cacheLib.clearTtlCache);

describe('POST /api/github/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the ttl cache and returns ok with a clearedAt timestamp', async () => {
    const { POST } = await import('@/app/api/github/sync/route');

    const res = await POST();

    expect(mockClearTtlCache).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.clearedAt).toBe('string');
    expect(Number.isNaN(new Date(data.clearedAt).getTime())).toBe(false);
  });
});
