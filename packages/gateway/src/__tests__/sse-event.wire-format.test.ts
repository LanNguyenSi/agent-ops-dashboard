import { describe, expect, it } from 'vitest';
import type { Agent, SSEEvent } from '../types.js';
import { SSE_EVENT_TYPES } from '../types.js';

// Wire-format fixtures for every SSEEvent variant: this pins the exact JSON
// shape that goes out over `data: <json>\n\n`. The discriminated union
// (types.ts) is a typing-only change; these fixtures are the evidence that
// the actual bytes on the wire have not moved for any of the six event
// types PR #89 covers.
const TIMESTAMP = '2026-08-22T00:00:00.000Z';

const agent: Agent = {
  id: 'agent-1',
  name: 'probe',
  status: 'online',
  lastSeen: TIMESTAMP,
  tags: ['ci'],
  registeredAt: TIMESTAMP,
};

const fixtures: Record<(typeof SSE_EVENT_TYPES)[number], SSEEvent> = {
  'agent:registered': { type: 'agent:registered', data: agent, timestamp: TIMESTAMP },
  'agent:updated': { type: 'agent:updated', data: agent, timestamp: TIMESTAMP },
  'agent:offline': { type: 'agent:offline', data: agent, timestamp: TIMESTAMP },
  'agent:deleted': { type: 'agent:deleted', data: agent, timestamp: TIMESTAMP },
  snapshot: { type: 'snapshot', data: [agent], timestamp: TIMESTAMP },
  'agent:command': {
    type: 'agent:command',
    data: { agentId: agent.id, command: 'restart', args: ['--force'] },
    timestamp: TIMESTAMP,
  },
};

const expectedFrames: Record<(typeof SSE_EVENT_TYPES)[number], string> = {
  'agent:registered': `data: {"type":"agent:registered","data":{"id":"agent-1","name":"probe","status":"online","lastSeen":"2026-08-22T00:00:00.000Z","tags":["ci"],"registeredAt":"2026-08-22T00:00:00.000Z"},"timestamp":"2026-08-22T00:00:00.000Z"}\n\n`,
  'agent:updated': `data: {"type":"agent:updated","data":{"id":"agent-1","name":"probe","status":"online","lastSeen":"2026-08-22T00:00:00.000Z","tags":["ci"],"registeredAt":"2026-08-22T00:00:00.000Z"},"timestamp":"2026-08-22T00:00:00.000Z"}\n\n`,
  'agent:offline': `data: {"type":"agent:offline","data":{"id":"agent-1","name":"probe","status":"online","lastSeen":"2026-08-22T00:00:00.000Z","tags":["ci"],"registeredAt":"2026-08-22T00:00:00.000Z"},"timestamp":"2026-08-22T00:00:00.000Z"}\n\n`,
  'agent:deleted': `data: {"type":"agent:deleted","data":{"id":"agent-1","name":"probe","status":"online","lastSeen":"2026-08-22T00:00:00.000Z","tags":["ci"],"registeredAt":"2026-08-22T00:00:00.000Z"},"timestamp":"2026-08-22T00:00:00.000Z"}\n\n`,
  snapshot: `data: {"type":"snapshot","data":[{"id":"agent-1","name":"probe","status":"online","lastSeen":"2026-08-22T00:00:00.000Z","tags":["ci"],"registeredAt":"2026-08-22T00:00:00.000Z"}],"timestamp":"2026-08-22T00:00:00.000Z"}\n\n`,
  'agent:command': `data: {"type":"agent:command","data":{"agentId":"agent-1","command":"restart","args":["--force"]},"timestamp":"2026-08-22T00:00:00.000Z"}\n\n`,
};

describe('SSEEvent wire format (per type)', () => {
  it.each(SSE_EVENT_TYPES)('serializes the %s frame byte-for-byte as before the union', (type) => {
    const event = fixtures[type];
    const frame = `data: ${JSON.stringify(event)}\n\n`;
    expect(frame).toBe(expectedFrames[type]);
  });

  it('covers all six SSE_EVENT_TYPES with a fixture', () => {
    expect(Object.keys(fixtures).sort()).toEqual([...SSE_EVENT_TYPES].sort());
  });
});
