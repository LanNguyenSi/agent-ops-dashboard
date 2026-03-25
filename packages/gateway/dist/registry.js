import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const OFFLINE_TIMEOUT_MS = 60_000; // 1 minute without heartbeat = offline
const PERSIST_FILE = process.env.REGISTRY_FILE ?? path.join(process.cwd(), 'agent-registry.json');
export class AgentRegistry {
    agents = new Map();
    timers = new Map();
    listeners = [];
    constructor() {
        this.loadFromDisk();
    }
    register(payload) {
        const id = randomUUID();
        const now = new Date().toISOString();
        const agent = {
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
    heartbeat(id, payload) {
        const agent = this.agents.get(id);
        if (!agent)
            return null;
        const updated = {
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
    getAll() {
        return Array.from(this.agents.values());
    }
    get(id) {
        return this.agents.get(id);
    }
    delete(id) {
        const agent = this.agents.get(id);
        if (!agent)
            return false;
        const timer = this.timers.get(id);
        if (timer)
            clearTimeout(timer);
        this.timers.delete(id);
        this.agents.delete(id);
        this.saveToDisk();
        this.emit(agent, 'agent:deleted');
        return true;
    }
    onUpdate(listener) {
        this.listeners.push(listener);
    }
    emit(agent, event) {
        for (const listener of this.listeners) {
            listener(agent, event);
        }
    }
    resetTimer(id) {
        const existing = this.timers.get(id);
        if (existing)
            clearTimeout(existing);
        const timer = setTimeout(() => {
            const agent = this.agents.get(id);
            if (agent) {
                const offline = { ...agent, status: 'offline', lastSeen: new Date().toISOString() };
                this.agents.set(id, offline);
                this.saveToDisk();
                this.emit(offline, 'agent:offline');
            }
        }, OFFLINE_TIMEOUT_MS);
        this.timers.set(id, timer);
    }
    loadFromDisk() {
        try {
            if (fs.existsSync(PERSIST_FILE)) {
                const data = fs.readFileSync(PERSIST_FILE, 'utf-8');
                const stored = JSON.parse(data);
                for (const agent of stored) {
                    this.agents.set(agent.id, agent);
                    // Don't restart timers for offline agents, only online ones
                    if (agent.status === 'online') {
                        this.resetTimer(agent.id);
                    }
                }
                console.log(`✅ Loaded ${stored.length} agent(s) from ${PERSIST_FILE}`);
            }
        }
        catch (error) {
            console.error('⚠️ Failed to load registry from disk:', error);
        }
    }
    saveToDisk() {
        try {
            const agents = Array.from(this.agents.values());
            fs.writeFileSync(PERSIST_FILE, JSON.stringify(agents, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('⚠️ Failed to save registry to disk:', error);
        }
    }
}
