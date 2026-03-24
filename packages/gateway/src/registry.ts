import { Agent, AgentStatus, RegisterPayload, HeartbeatPayload } from './types.js';
import { randomUUID } from 'crypto';

const OFFLINE_TIMEOUT_MS = 60_000; // 1 minute without heartbeat = offline

export class AgentRegistry {
  private agents = new Map<string, Agent>();
  private timers = new Map<string, NodeJS.Timeout>();
  private listeners: Array<(agent: Agent, event: string) => void> = [];

  register(payload: RegisterPayload): Agent {
    const id = randomUUID();
    const now = new Date().toISOString();
    const agent: Agent = {
      id,
      name: payload.name,
      status: 'online',
      lastSeen: now,
      registeredAt: now,
      tags: payload.tags ?? [],
      meta: payload.meta,
    };
    this.agents.set(id, agent);
    this.resetTimer(id);
    this.emit(agent, 'agent:registered');
    return agent;
  }

  heartbeat(id: string, payload: HeartbeatPayload): Agent | null {
    const agent = this.agents.get(id);
    if (!agent) return null;

    const updated: Agent = {
      ...agent,
      status: payload.status ?? 'online',
      currentTask: payload.currentTask ?? agent.currentTask,
      lastSeen: new Date().toISOString(),
    };
    this.agents.set(id, updated);
    this.resetTimer(id);
    this.emit(updated, 'agent:updated');
    return updated;
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  onUpdate(listener: (agent: Agent, event: string) => void) {
    this.listeners.push(listener);
  }

  private emit(agent: Agent, event: string) {
    for (const listener of this.listeners) {
      listener(agent, event);
    }
  }

  private resetTimer(id: string) {
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      const agent = this.agents.get(id);
      if (agent) {
        const offline = { ...agent, status: 'offline' as AgentStatus, lastSeen: new Date().toISOString() };
        this.agents.set(id, offline);
        this.emit(offline, 'agent:offline');
      }
    }, OFFLINE_TIMEOUT_MS);

    this.timers.set(id, timer);
  }
}
