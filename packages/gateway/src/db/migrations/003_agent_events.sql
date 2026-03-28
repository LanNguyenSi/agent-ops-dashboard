-- Migration 003: Activity Feed / Event Log
-- Append-only event log for all agent and state activity

CREATE TABLE IF NOT EXISTS agent_events (
  id          BIGSERIAL   PRIMARY KEY,
  agent_id    TEXT,
  event_type  TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id   ON agent_events (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_event_type ON agent_events (event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON agent_events (created_at DESC);
