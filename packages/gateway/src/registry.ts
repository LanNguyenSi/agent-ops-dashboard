import { Agent, AgentStatus, RegisterPayload, HeartbeatPayload } from './types.js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const OFFLINE_TIMEOUT_MS = 60_000; // 1 minute without heartbeat = offline
const PERSIST_FILE = process.env.REGISTRY_FILE ?? path.join(process.cwd(), 'agent-registry.json');

export class AgentRegistry {
  private agents = new Map<string, Agent>();
  private timers = new Map<string, NodeJS.Timeout>();
  private listeners: Array<(agent: Agent, event: string) => void> = [];

  constructor() {
    this.loadFromDisk();
  }

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
    this.saveToDisk();
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
    this.saveToDisk();
    this.emit(updated, 'agent:updated');
    return updated;
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  delete(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);

    this.agents.delete(id);
    this.saveToDisk();
    this.emit(agent, 'agent:deleted');
    return true;
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
        this.saveToDisk();
        this.emit(offline, 'agent:offline');
      }
    }, OFFLINE_TIMEOUT_MS);

    this.timers.set(id, timer);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(PERSIST_FILE)) {
        const data = fs.readFileSync(PERSIST_FILE, 'utf-8');
        const stored = JSON.parse(data) as Agent[];
        for (const agent of stored) {
          // Mark all agents as offline on startup — they must heartbeat to come online
          // This prevents stale "online" entries when gateway restarts
          const restored: Agent = { ...agent, status: 'offline' };
          this.agents.set(restored.id, restored);
        }
        console.log(`✅ Loaded ${stored.length} agent(s) from ${PERSIST_FILE}`);
      }
    } catch (error) {
      console.error('⚠️ Failed to load registry from disk:', error);
    }
  }

  private saveToDisk() {
    try {
      const agents = Array.from(this.agents.values());
      fs.writeFileSync(PERSIST_FILE, JSON.stringify(agents, null, 2), 'utf-8');
    } catch (error) {
      console.error('⚠️ Failed to save registry to disk:', error);
    }
  }
}
