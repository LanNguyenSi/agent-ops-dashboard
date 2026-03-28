import { getPool } from "../db/pool.js";
import type { StateEntry, StateKeyInfo } from "./state.schema.js";

/** Stub event emitter — replaced by Task 003 implementation */
async function emitEvent(
  type: string,
  _agentId: string | null,
  _data: Record<string, unknown>
): Promise<void> {
  // Task 003 will replace this with real event emission
  console.log(`[events:stub] ${type}`, _data);
}

function rowToEntry(row: Record<string, unknown>): StateEntry {
  return {
    id: row.id as string,
    namespace: row.namespace as string,
    key: row.key as string,
    value: row.value as Record<string, unknown>,
    version: row.version as number,
    updatedBy: (row.updated_by as string | null) ?? null,
    updatedAt: (row.updated_at as Date).toISOString(),
    createdAt: (row.created_at as Date).toISOString(),
  };
}

/** List all keys in a namespace */
export async function listNamespace(namespace: string): Promise<StateKeyInfo[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    key: string;
    version: number;
    updated_by: string | null;
    updated_at: Date;
  }>(
    `SELECT key, version, updated_by, updated_at
     FROM agent_state
     WHERE namespace = $1
     ORDER BY updated_at DESC`,
    [namespace]
  );
  return rows.map((r) => ({
    key: r.key,
    version: r.version,
    updatedBy: r.updated_by ?? null,
    updatedAt: r.updated_at.toISOString(),
  }));
}

/** Get a single state entry */
export async function getState(
  namespace: string,
  key: string
): Promise<StateEntry | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT * FROM agent_state WHERE namespace = $1 AND key = $2",
    [namespace, key]
  );
  return rows.length > 0 ? rowToEntry(rows[0]) : null;
}

/** Create or update a state entry (upsert) */
export async function setState(
  namespace: string,
  key: string,
  value: Record<string, unknown>,
  updatedBy?: string
): Promise<StateEntry> {
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO agent_state (namespace, key, value, updated_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (namespace, key) DO UPDATE
     SET value = EXCLUDED.value,
         version = agent_state.version + 1,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
     RETURNING *`,
    [namespace, key, JSON.stringify(value), updatedBy ?? null]
  );
  const entry = rowToEntry(rows[0]);
  await emitEvent("state.set", updatedBy ?? null, {
    namespace,
    key,
    version: entry.version,
    updatedBy,
  });
  return entry;
}

/** Delete a state entry */
export async function deleteState(
  namespace: string,
  key: string
): Promise<boolean> {
  const pool = getPool();
  const { rows } = await pool.query(
    "DELETE FROM agent_state WHERE namespace = $1 AND key = $2 RETURNING id",
    [namespace, key]
  );
  if (rows.length > 0) {
    await emitEvent("state.deleted", null, { namespace, key });
    return true;
  }
  return false;
}

export type CasResult =
  | { ok: true; entry: StateEntry }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict"; expectedVersion: number; actualVersion: number };

/** Atomic Compare-And-Swap */
export async function casState(
  namespace: string,
  key: string,
  expectedVersion: number,
  value: Record<string, unknown>,
  updatedBy?: string
): Promise<CasResult> {
  const pool = getPool();

  const { rows } = await pool.query(
    `UPDATE agent_state
     SET value      = $3,
         version    = version + 1,
         updated_by = $4,
         updated_at = NOW()
     WHERE namespace = $1
       AND key       = $2
       AND version   = $5
     RETURNING *`,
    [namespace, key, JSON.stringify(value), updatedBy ?? null, expectedVersion]
  );

  if (rows.length > 0) {
    const entry = rowToEntry(rows[0]);
    await emitEvent("state.cas.success", updatedBy ?? null, {
      namespace,
      key,
      version: entry.version,
    });
    return { ok: true, entry };
  }

  // Check if key exists to distinguish 404 vs 409
  const existing = await getState(namespace, key);
  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  await emitEvent("state.cas.conflict", updatedBy ?? null, {
    namespace,
    key,
    expectedVersion,
    actualVersion: existing.version,
  });
  return {
    ok: false,
    reason: "conflict",
    expectedVersion,
    actualVersion: existing.version,
  };
}
