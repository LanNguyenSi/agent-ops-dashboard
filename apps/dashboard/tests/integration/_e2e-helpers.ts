const E2E_BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

let cached: boolean | null = null;

export async function isDevServerUp(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 500);
    // Probe the health JSON endpoint so a non-Next.js server at port 3000
    // (returning HTML) does not produce a false positive.
    const res = await fetch(`${E2E_BASE}/api/health`, { signal: ac.signal });
    clearTimeout(timer);
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      cached = false;
      return cached;
    }
    const body = await res.json() as Record<string, unknown>;
    cached = body.status === 'ok';
  } catch {
    cached = false;
  }
  return cached;
}

export { E2E_BASE };
