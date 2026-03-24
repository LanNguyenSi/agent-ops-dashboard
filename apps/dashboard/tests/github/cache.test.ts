import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearTtlCache, getOrRefreshCache } from "@/lib/github/cache";

describe("github cache", () => {
  beforeEach(() => {
    clearTtlCache();
    vi.useRealTimers();
  });

  it("returns a cache hit while ttl is valid", async () => {
    const loader = vi.fn().mockResolvedValue("value");

    const first = await getOrRefreshCache("repos", 1_000, loader);
    const second = await getOrRefreshCache("repos", 1_000, loader);

    expect(first.cacheState).toBe("miss");
    expect(second.cacheState).toBe("hit");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("returns stale data and refreshes in the background after ttl expiry", async () => {
    vi.useFakeTimers();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve("second"), 50);
          })
      );

    const first = await getOrRefreshCache("repos", 100, loader);
    await vi.advanceTimersByTimeAsync(150);

    const stale = await getOrRefreshCache("repos", 100, loader);
    expect(first.cacheState).toBe("miss");
    expect(stale.cacheState).toBe("stale");
    expect(stale.value).toBe("first");

    await vi.advanceTimersByTimeAsync(60);

    const refreshed = await getOrRefreshCache("repos", 100, loader);
    expect(refreshed.cacheState).toBe("hit");
    expect(refreshed.value).toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
