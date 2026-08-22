import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { REGISTRY_EVENT_TYPES, SSE_EVENT_TYPES } from '../types.js';

// Point the registry's persistence at a throwaway tmp file so the suite never
// reads or writes the real agent-registry.json in the package dir. Set before
// the registry module is imported (PERSIST_FILE is resolved at module load),
// hence the dynamic import in beforeAll.
const REGISTRY_FILE = path.join(os.tmpdir(), `agent-registry-sse-test-${process.pid}.json`);

let AgentRegistry: typeof import('../registry.js').AgentRegistry;

beforeAll(async () => {
  process.env.REGISTRY_FILE = REGISTRY_FILE;
  ({ AgentRegistry } = await import('../registry.js'));
});

afterAll(() => {
  fs.rmSync(REGISTRY_FILE, { force: true });
  delete process.env.REGISTRY_FILE;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AgentRegistry SSE event names', () => {
  it('only ever emits event names that are in the SSEEvent union', async () => {
    vi.useFakeTimers();
    const registry = new AgentRegistry();
    const emitted: string[] = [];
    registry.onUpdate((_agent, event) => {
      emitted.push(event);
    });

    const agent = registry.register({ name: 'probe' });
    registry.heartbeat(agent.id, { status: 'busy' });
    // Advance past the offline timeout to trigger the timer-driven emit.
    await vi.advanceTimersByTimeAsync(60_000);
    registry.delete(agent.id);

    for (const name of emitted) {
      expect(SSE_EVENT_TYPES).toContain(name);
    }
  });

  it('emits every event name the registry declares (register/heartbeat/offline/delete)', async () => {
    vi.useFakeTimers();
    const registry = new AgentRegistry();
    const emitted = new Set<string>();
    registry.onUpdate((_agent, event) => {
      emitted.add(event);
    });

    const agent = registry.register({ name: 'probe-2' });
    registry.heartbeat(agent.id, { status: 'idle' });
    await vi.advanceTimersByTimeAsync(60_000);
    registry.delete(agent.id);

    expect(emitted).toEqual(new Set(REGISTRY_EVENT_TYPES));
  });
});
