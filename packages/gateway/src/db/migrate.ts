import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { getPool } from "./pool.js";

const MIGRATIONS_DIR = join(import.meta.dirname, "migrations");

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  // Create migrations tracking table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id        SERIAL PRIMARY KEY,
      filename  TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const { rows: applied } = await pool.query<{ filename: string }>(
    "SELECT filename FROM _migrations ORDER BY filename"
  );
  const appliedSet = new Set(applied.map((r) => r.filename));

  // Read and sort migration files
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrate] Applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${err}`);
    } finally {
      client.release();
    }
  }
}
