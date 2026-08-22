export type AgentStatus = 'online' | 'offline' | 'idle' | 'busy';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  lastSeen: string;        // ISO timestamp
  currentTask?: string;
  tags: string[];
  registeredAt: string;    // ISO timestamp
  meta?: Record<string, unknown>;
}

export interface RegisterPayload {
  name: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface HeartbeatPayload {
  status?: AgentStatus;
  currentTask?: string;
}

export interface CommandPayload {
  command: string;
  args?: string[];
}

// Event names the registry itself emits via AgentRegistry#onUpdate. This
// array is the single source of truth: RegistryEventType is derived from it
// below, and tests enumerate emitted names against it at runtime. Keep in
// sync with the this.emit(...) call sites in registry.ts.
export const REGISTRY_EVENT_TYPES = ['agent:registered', 'agent:updated', 'agent:offline', 'agent:deleted'] as const;
export type RegistryEventType = (typeof REGISTRY_EVENT_TYPES)[number];

// All event names the gateway can put on the /events SSE stream. Includes
// the registry events above plus the two the gateway builds itself in
// index.ts (the initial 'snapshot' frame and the 'agent:command' back-channel
// frame). Keep in sync with docs/architecture.md's SSE stream list.
export const SSE_EVENT_TYPES = [...REGISTRY_EVENT_TYPES, 'snapshot', 'agent:command'] as const;
export type SSEEventType = (typeof SSE_EVENT_TYPES)[number];

// SSEEvent is a discriminated union keyed on `type`: each registry event
// (agent:registered/updated/offline/deleted) carries a single Agent, the
// gateway's own `snapshot` frame carries the full Agent[] list, and the
// `agent:command` back-channel frame carries the command payload plus the
// target agentId. This is a typing-only change: the JSON on the wire is
// unchanged, but a wrong type/data pairing (e.g. `snapshot` with a command
// payload) now fails tsc instead of type-checking silently.
export interface SSERegistryEvent {
  type: RegistryEventType;
  data: Agent;
  timestamp: string;
}

export interface SSESnapshotEvent {
  type: 'snapshot';
  data: Agent[];
  timestamp: string;
}

export interface SSECommandEvent {
  type: 'agent:command';
  data: CommandPayload & { agentId: string };
  timestamp: string;
}

export type SSEEvent = SSERegistryEvent | SSESnapshotEvent | SSECommandEvent;
