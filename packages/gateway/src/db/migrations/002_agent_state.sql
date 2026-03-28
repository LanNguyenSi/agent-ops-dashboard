-- Migration 002: Agent State Store
-- Namespaced, versioned key-value store with atomic CAS support

CREATE TABLE IF NOT EXISTS agent_state (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace   TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  value       JSONB       NOT NULL DEFAULT '{}',
  version     INTEGER     NOT NULL DEFAULT 1,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_state_namespace_key_unique UNIQUE (namespace, key)
);

CREATE INDEX IF NOT EXISTS idx_agent_state_namespace ON agent_state (namespace);
CREATE INDEX IF NOT EXISTS idx_agent_state_updated_at ON agent_state (updated_at DESC);
