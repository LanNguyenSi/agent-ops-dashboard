const E2E_BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

let cached: boolean | null = null;

export async function isDevServerUp(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 500);
    await fetch(E2E_BASE, { signal: ac.signal });
    clearTimeout(timer);
    cached = true;
  } catch {
    cached = false;
  }
  return cached;
}

export { E2E_BASE };
