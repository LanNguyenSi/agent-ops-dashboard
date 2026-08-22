import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SSE_EVENT_TYPES } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// packages/gateway/src/__tests__ -> repo root
const DOCS_PATH = path.resolve(__dirname, '../../../../docs/architecture.md');

describe('docs/architecture.md SSE event list parity', () => {
  it('documents exactly the event names in SSE_EVENT_TYPES (both directions)', () => {
    const text = fs.readFileSync(DOCS_PATH, 'utf-8');

    // The event list lives in the "SSE design" section, in the sentence
    // "... broadcasts the *registry* SSE stream: `snapshot`, `agent:registered`,
    // ..., `agent:command`." Anchor on that sentence rather than a hardcoded
    // line number so the test survives unrelated doc edits shifting lines,
    // while still failing loudly if the sentence itself disappears.
    const match = text.match(/broadcasts the \*registry\* SSE stream:\s*([^.]+)\./);
    expect(
      match,
      'could not find the "broadcasts the *registry* SSE stream: ..." sentence in docs/architecture.md',
    ).not.toBeNull();

    const listSegment = match![1];
    const documented = new Set(
      Array.from(listSegment.matchAll(/`([^`]+)`/g), (m) => m[1]),
    );

    expect(documented).toEqual(new Set(SSE_EVENT_TYPES));
  });
});
