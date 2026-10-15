import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Throwaway persistence file, set before the registry module loads
// (PERSIST_FILE is resolved at import time), hence the dynamic import.
const REGISTRY_FILE = path.join(os.tmpdir(), `agent-registry-disconnect-test-${process.pid}.json`);

let AgentRegistry: typeof import('../registry.js').AgentRegistry;
let eventService: typeof import('../events/event.service.js').eventService;

beforeAll(async () => {
  process.env.REGISTRY_FILE = REGISTRY_FILE;
  ({ AgentRegistry } = await import('../registry.js'));
  ({ eventService } = await import('../events/event.service.js'));
});

afterAll(() => {
  fs.rmSync(REGISTRY_FILE, { force: true });
  delete process.env.REGISTRY_FILE;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AgentRegistry durable agent.disconnected events', () => {
  it('records agent.disconnected with reason "offline" when the heartbeat timer expires', async () => {
    vi.useFakeTimers();
    const emit = vi.spyOn(eventService, 'emit').mockResolvedValue({} as never);
    const registry = new AgentRegistry();
    const agent = registry.register({ name: 'probe' });

    await vi.advanceTimersByTimeAsync(60_000);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('agent.disconnected', agent.id, {
      agentId: agent.id,
      name: 'probe',
      reason: 'offline',
    });
  });

  it('records agent.disconnected with reason "deleted" when the agent is deleted', () => {
    vi.useFakeTimers();
    const emit = vi.spyOn(eventService, 'emit').mockResolvedValue({} as never);
    const registry = new AgentRegistry();
    const agent = registry.register({ name: 'probe-2' });

    registry.delete(agent.id);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('agent.disconnected', agent.id, {
      agentId: agent.id,
      name: 'probe-2',
      reason: 'deleted',
    });
  });

  it('records exactly one agent.disconnected when an offline agent is then deleted', async () => {
    vi.useFakeTimers();
    const emit = vi.spyOn(eventService, 'emit').mockResolvedValue({} as never);
    const registry = new AgentRegistry();
    const agent = registry.register({ name: 'probe-4' });

    await vi.advanceTimersByTimeAsync(60_000);
    registry.delete(agent.id);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('agent.disconnected', agent.id, expect.objectContaining({ reason: 'offline' }));
  });

  it('does not record a disconnect for a heartbeat or when deleting an unknown id', () => {
    vi.useFakeTimers();
    const emit = vi.spyOn(eventService, 'emit').mockResolvedValue({} as never);
    const registry = new AgentRegistry();
    const agent = registry.register({ name: 'probe-3' });

    registry.heartbeat(agent.id, { status: 'busy' });
    expect(registry.delete('does-not-exist')).toBe(false);

    expect(emit).not.toHaveBeenCalled();
  });

  it('swallows a failing durable write so the registry transition still completes', async () => {
    vi.useFakeTimers();
    vi.spyOn(eventService, 'emit').mockRejectedValue(new Error('db down'));
    const registry = new AgentRegistry();
    const seen: string[] = [];
    registry.onUpdate((_a, e) => seen.push(e));
    const agent = registry.register({ name: 'probe-4' });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(registry.delete(agent.id)).toBe(true);

    expect(seen).toContain('agent:offline');
    expect(seen).toContain('agent:deleted');
  });
});
