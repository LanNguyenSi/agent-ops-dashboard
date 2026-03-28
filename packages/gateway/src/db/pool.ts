import pg from "pg";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    _pool = new Pool({ connectionString });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

/** True if DATABASE_URL is set — used to skip DB logic when running without PG */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
