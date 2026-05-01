/**
 * Agent-Ops Client Types
 * Matches gateway API contracts
 */

export type AgentStatus = 'online' | 'offline' | 'idle' | 'busy';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  lastSeen: string;
  currentTask?: string;
  tags: string[];
  registeredAt: string;
  meta?: Record<string, any>;
}

export interface RegisterPayload {
  name: string;
  tags?: string[];
  meta?: Record<string, any>;
}

export interface HeartbeatPayload {
  status?: AgentStatus;
  currentTask?: string;
}

export interface CommandPayload {
  command: string;
  args?: any;
}

export interface CommandResponse {
  ok: boolean;
  result?: any;
  error?: string;
}

export interface ClientConfig {
  gatewayUrl: string;
  agentId?: string;
  agentName?: string;
}

// State-store types (mirror packages/gateway/src/state/state.schema.ts)

export interface StateEntry {
  id: string;
  namespace: string;
  key: string;
  value: Record<string, unknown>;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface StateKeyInfo {
  key: string;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface StateListResult {
  namespace: string;
  count: number;
  keys: StateKeyInfo[];
}

export interface CasConflictError {
  error: "CAS_CONFLICT";
  expectedVersion: number;
  actualVersion: number;
  message: string;
}
