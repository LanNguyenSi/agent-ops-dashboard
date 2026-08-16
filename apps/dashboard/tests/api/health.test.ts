import { describe, it, expect, vi, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('GET /api/health', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock('fs');
    vi.resetModules();
  });

  it('reports ok status with version and github integration config', async () => {
    process.env.GITHUB_TOKEN = 'tok';
    process.env.GITHUB_REPOS = 'acme/one,acme/two';
    const { GET } = await import('@/app/api/health/route');

    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.version).toBe('string');
    expect(data.config).toEqual({ githubIntegration: true, repos: 2 });
  });

  it('reports githubIntegration false when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN;
    process.env.GITHUB_REPOS = 'acme/one';
    const { GET } = await import('@/app/api/health/route');

    const res = await GET();

    const data = await res.json();
    expect(data.config.githubIntegration).toBe(false);
  });

  it('falls back to a healthy response with an error note when package.json cannot be read', async () => {
    vi.resetModules();
    vi.doMock('fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('fs')>();
      const throwingReadFileSync = () => {
        throw new Error('ENOENT: no such file');
      };
      return {
        ...actual,
        default: { ...actual, readFileSync: throwingReadFileSync },
        readFileSync: throwingReadFileSync,
      };
    });
    const { GET } = await import('@/app/api/health/route');

    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBe('unknown');
    expect(data.error).toBe('Could not read version info');
  });
});
