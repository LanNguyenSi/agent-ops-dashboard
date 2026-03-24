type CacheState = "hit" | "miss" | "stale";

interface CacheEntry<T> {
  value?: T;
  expiresAt: number;
  updatedAt?: number;
  refreshPromise?: Promise<T>;
}

const ttlCache = new Map<string, CacheEntry<unknown>>();

export async function getOrRefreshCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<{ value: T; cacheState: CacheState; updatedAt: number }> {
  const now = Date.now();
  const existing = ttlCache.get(key) as CacheEntry<T> | undefined;

  if (existing?.value !== undefined && now < existing.expiresAt) {
    return {
      value: existing.value,
      cacheState: "hit",
      updatedAt: existing.updatedAt ?? now,
    };
  }

  if (existing?.refreshPromise) {
    if (existing.value !== undefined) {
      return {
        value: existing.value,
        cacheState: "stale",
        updatedAt: existing.updatedAt ?? now,
      };
    }

    const value = await existing.refreshPromise;
    const refreshed = ttlCache.get(key) as CacheEntry<T> | undefined;
    return {
      value,
      cacheState: "miss",
      updatedAt: refreshed?.updatedAt ?? Date.now(),
    };
  }

  const refreshPromise = (async () => {
    const value = await loader();
    ttlCache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      updatedAt: Date.now(),
    });
    return value;
  })().catch((error) => {
    const current = ttlCache.get(key) as CacheEntry<T> | undefined;

    if (current?.value !== undefined) {
      ttlCache.set(key, {
        value: current.value,
        expiresAt: current.expiresAt,
        updatedAt: current.updatedAt,
      });
    } else {
      ttlCache.delete(key);
    }

    throw error;
  });

  ttlCache.set(key, {
    value: existing?.value,
    expiresAt: existing?.expiresAt ?? 0,
    updatedAt: existing?.updatedAt,
    refreshPromise,
  });

  if (existing?.value !== undefined) {
    void refreshPromise;
    return {
      value: existing.value,
      cacheState: "stale",
      updatedAt: existing.updatedAt ?? now,
    };
  }

  const value = await refreshPromise;
  const refreshed = ttlCache.get(key) as CacheEntry<T> | undefined;

  return {
    value,
    cacheState: "miss",
    updatedAt: refreshed?.updatedAt ?? Date.now(),
  };
}

export function clearTtlCache(): void {
  ttlCache.clear();
}
