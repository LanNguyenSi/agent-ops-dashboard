// Domain types are sourced from @opentriologue/client so the mcp wrapper, the
// CLI/SDK client, and the gateway all share one shape. mcp keeps only the
// MCP-protocol-specific helpers local.

import type { Agent, RegisterPayload } from "@opentriologue/client";

export type {
  Agent,
  AgentStatus,
  RegisterPayload,
  HeartbeatPayload,
  StateEntry,
  StateKeyInfo,
  StateListResult,
  CasConflictError,
} from "@opentriologue/client";

// Aliases preserved for compatibility with existing mcp tool signatures.
export type RegisterAgentInput = RegisterPayload;
export type RegisterAgentResult = Pick<
  Agent,
  "id" | "name" | "status" | "registeredAt"
>;

// Event types (mcp-internal, not part of the gateway/client surface yet).
export interface AgentEvent {
  id: number;
  agentId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

// MCP tool result helpers
export interface McpSuccess<T> {
  success: true;
  data: T;
}

export interface McpError {
  success: false;
  error: string;
  details?: unknown;
}

export type McpResult<T> = McpSuccess<T> | McpError;
