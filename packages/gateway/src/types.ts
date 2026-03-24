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

export interface SSEEvent {
  type: 'agent:registered' | 'agent:updated' | 'agent:offline' | 'snapshot';
  data: Agent | Agent[];
  timestamp: string;
}
