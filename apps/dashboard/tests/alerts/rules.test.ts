import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  evaluateRules,
  getRuleById,
  getEnabledRules,
  DEFAULT_RULES,
  type AlertRule,
} from '@/lib/alerts/rules';
import type { PipelineRun } from '@/lib/pipeline/types';
import type { Agent } from '@/lib/agents/types';

// ---------------------------------------------------------------------------
// Minimal factory helpers
// ---------------------------------------------------------------------------
const NOW_ISO = '2024-06-01T12:00:00.000Z';
const NOW_MS = new Date(NOW_ISO).getTime();

function makeRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    id: 1,
    name: 'CI',
    status: 'success',
    conclusion: 'success',
    repository: 'org/repo',
    branch: 'main',
    commit: 'abc123',
    commitMessage: 'feat: add thing',
    author: 'dev',
    startedAt: NOW_ISO,
    completedAt: NOW_ISO,
    duration: 60_000,
    htmlUrl: 'https://github.com/org/repo/actions/runs/1',
    ...overrides,
  };
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    name: 'Hermes',
    status: 'online',
    lastMessage: null,
    lastMessageAt: NOW_ISO,
    connectedAt: NOW_ISO,
    uptime: 3_600_000,
    platform: 'linux',
    ...overrides,
  };
}

function makeRule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'test-rule',
    name: 'Test Rule',
    condition: 'high_failure_rate',
    threshold: 50,
    severity: 'warning',
    enabled: true,
    description: 'Test',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// evaluateHighFailureRate
// ---------------------------------------------------------------------------
describe('evaluateHighFailureRate', () => {
  const rule = makeRule({ id: 'high-failure-rate', condition: 'high_failure_rate', threshold: 50 });

  it('does NOT alert when failure rate equals threshold exactly (boundary: > not >=)', () => {
    // 1 of 2 completed runs failed → 50% == threshold, should NOT alert
    const runs: PipelineRun[] = [
      makeRun({ conclusion: 'failure', completedAt: NOW_ISO }),
      makeRun({ id: 2, conclusion: 'success', completedAt: NOW_ISO }),
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });

  it('alerts when failure rate exceeds threshold', () => {
    // 2 of 3 completed runs failed → 66.7% > 50% threshold
    const runs: PipelineRun[] = [
      makeRun({ id: 1, conclusion: 'failure', completedAt: NOW_ISO }),
      makeRun({ id: 2, conclusion: 'failure', completedAt: NOW_ISO }),
      makeRun({ id: 3, conclusion: 'success', completedAt: NOW_ISO }),
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleId).toBe('high-failure-rate');
    expect(alerts[0].message).toMatch(/66\.7%/);
  });

  it('ignores runs without completedAt', () => {
    const runs: PipelineRun[] = [
      makeRun({ conclusion: 'failure', completedAt: null }), // not complete, ignored
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });

  it('respects repo filter on the rule', () => {
    const repoRule = makeRule({ condition: 'high_failure_rate', threshold: 50, repos: ['org/other'] });
    const runs: PipelineRun[] = [
      makeRun({ id: 1, conclusion: 'failure', completedAt: NOW_ISO, repository: 'org/repo' }),
      makeRun({ id: 2, conclusion: 'failure', completedAt: NOW_ISO, repository: 'org/repo' }),
    ];
    // All runs are in 'org/repo' but rule only applies to 'org/other' → no alert
    const alerts = evaluateRules([repoRule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// evaluatePipelineFailure
// ---------------------------------------------------------------------------
describe('evaluatePipelineFailure', () => {
  const rule = makeRule({ id: 'pipeline-failure', condition: 'pipeline_failure' });

  it('alerts for each completed failure run', () => {
    const runs: PipelineRun[] = [
      makeRun({ id: 1, conclusion: 'failure', completedAt: NOW_ISO }),
      makeRun({ id: 2, conclusion: 'failure', completedAt: NOW_ISO }),
      makeRun({ id: 3, conclusion: 'success', completedAt: NOW_ISO }),
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(2);
  });

  it('does not alert for non-failure conclusions', () => {
    const runs: PipelineRun[] = [
      makeRun({ conclusion: 'success', completedAt: NOW_ISO }),
      makeRun({ id: 2, conclusion: 'cancelled', completedAt: NOW_ISO }),
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });

  it('skips runs where completedAt is null (still running)', () => {
    const runs: PipelineRun[] = [
      makeRun({ conclusion: 'failure', completedAt: null }),
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });

  it('respects repo filter', () => {
    const repoRule = makeRule({ condition: 'pipeline_failure', repos: ['org/repo'] });
    const runs: PipelineRun[] = [
      makeRun({ id: 1, conclusion: 'failure', completedAt: NOW_ISO, repository: 'org/repo' }),
      makeRun({ id: 2, conclusion: 'failure', completedAt: NOW_ISO, repository: 'org/other' }),
    ];
    const alerts = evaluateRules([repoRule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].repository).toBe('org/repo');
  });
});

// ---------------------------------------------------------------------------
// evaluateAgentOffline
// ---------------------------------------------------------------------------
describe('evaluateAgentOffline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const rule = makeRule({ id: 'agent-offline', condition: 'agent_offline', threshold: 30 });

  it('alerts when agent has been offline longer than threshold', () => {
    // lastMessageAt was 31 minutes ago → offline 31 min > threshold 30 min
    const thirtyOneMinutesAgo = new Date(NOW_MS - 31 * 60_000).toISOString();
    const agents: Agent[] = [
      makeAgent({ status: 'offline', lastMessageAt: thirtyOneMinutesAgo }),
    ];
    const alerts = evaluateRules([rule], { agents, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleId).toBe('agent-offline');
  });

  it('does NOT alert when agent has been offline less than threshold', () => {
    // lastMessageAt was 29 minutes ago → offline 29 min < threshold 30 min
    const twentyNineMinutesAgo = new Date(NOW_MS - 29 * 60_000).toISOString();
    const agents: Agent[] = [
      makeAgent({ status: 'offline', lastMessageAt: twentyNineMinutesAgo }),
    ];
    const alerts = evaluateRules([rule], { agents, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });

  it('does NOT alert for online agents', () => {
    const thirtyOneMinutesAgo = new Date(NOW_MS - 31 * 60_000).toISOString();
    const agents: Agent[] = [
      makeAgent({ status: 'online', lastMessageAt: thirtyOneMinutesAgo }),
    ];
    const alerts = evaluateRules([rule], { agents, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// evaluateSlowBuilds
// ---------------------------------------------------------------------------
describe('evaluateSlowBuilds', () => {
  // threshold = 10 minutes = 600_000 ms
  const rule = makeRule({ id: 'slow-builds', condition: 'slow_builds', threshold: 10 });

  it('alerts when average build duration exceeds threshold', () => {
    // avg = (700_000 + 800_000) / 2 = 750_000 ms > 600_000 ms threshold
    const runs: PipelineRun[] = [
      makeRun({ id: 1, duration: 700_000 }),
      makeRun({ id: 2, duration: 800_000 }),
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleId).toBe('slow-builds');
  });

  it('does NOT alert when average build is under threshold', () => {
    // avg = (300_000 + 400_000) / 2 = 350_000 ms < 600_000 ms
    const runs: PipelineRun[] = [
      makeRun({ id: 1, duration: 300_000 }),
      makeRun({ id: 2, duration: 400_000 }),
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });

  it('skips runs with null duration', () => {
    const runs: PipelineRun[] = [
      makeRun({ duration: null }),
    ];
    const alerts = evaluateRules([rule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getRuleById / getEnabledRules
// ---------------------------------------------------------------------------
describe('getRuleById', () => {
  it('returns the matching rule', () => {
    const rule = getRuleById(DEFAULT_RULES, 'pipeline-failure');
    expect(rule).toBeDefined();
    expect(rule?.id).toBe('pipeline-failure');
  });

  it('returns undefined for unknown id', () => {
    expect(getRuleById(DEFAULT_RULES, 'nonexistent')).toBeUndefined();
  });
});

describe('getEnabledRules', () => {
  it('returns only enabled rules', () => {
    const rules: AlertRule[] = [
      makeRule({ id: 'r1', enabled: true }),
      makeRule({ id: 'r2', enabled: false }),
      makeRule({ id: 'r3', enabled: true }),
    ];
    const enabled = getEnabledRules(rules);
    expect(enabled).toHaveLength(2);
    expect(enabled.map((r) => r.id)).toEqual(['r1', 'r3']);
  });

  it('returns empty array when no rules are enabled', () => {
    const rules: AlertRule[] = [makeRule({ enabled: false })];
    expect(getEnabledRules(rules)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// evaluateRules: only enabled rules dispatch
// ---------------------------------------------------------------------------
describe('evaluateRules: disabled rules are skipped', () => {
  it('does not generate alerts for disabled rules', () => {
    const disabledRule = makeRule({
      condition: 'pipeline_failure',
      enabled: false,
    });
    const runs: PipelineRun[] = [
      makeRun({ conclusion: 'failure', completedAt: NOW_ISO }),
    ];
    const alerts = evaluateRules([disabledRule], { pipelineRuns: runs, timestamp: NOW_ISO });
    expect(alerts).toHaveLength(0);
  });

  it('generates alerts for enabled rules and skips disabled ones', () => {
    const enabled = makeRule({ id: 'r-on', condition: 'pipeline_failure', enabled: true });
    const disabled = makeRule({ id: 'r-off', condition: 'pipeline_failure', enabled: false });
    const runs: PipelineRun[] = [
      makeRun({ id: 1, conclusion: 'failure', completedAt: NOW_ISO }),
    ];
    const alerts = evaluateRules([enabled, disabled], { pipelineRuns: runs, timestamp: NOW_ISO });
    // Only the enabled rule fires
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleId).toBe('r-on');
  });
});
