import { describe, it, expect } from 'vitest';
import { calculateStats, calculateTrends } from '@/lib/pipeline/analytics';
import type { PipelineRun } from '@/lib/pipeline/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    id: 1,
    name: 'CI',
    status: 'success',
    conclusion: 'success',
    repository: 'org/repo',
    branch: 'main',
    commit: 'abc123',
    commitMessage: 'feat: x',
    author: 'dev',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:01:00Z',
    duration: 60_000,
    htmlUrl: 'https://github.com/org/repo/actions/runs/1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateStats
// ---------------------------------------------------------------------------
describe('calculateStats', () => {
  it('returns zeros for an empty run list (no divide-by-zero)', () => {
    const stats = calculateStats([]);
    expect(stats.totalRuns).toBe(0);
    expect(stats.successRuns).toBe(0);
    expect(stats.failureRuns).toBe(0);
    expect(stats.cancelledRuns).toBe(0);
    expect(stats.successRate).toBe(0);
    expect(stats.failureRate).toBe(0);
    expect(stats.avgDuration).toBeNull();
  });

  it('computes correct success/failure rates for a mixed set', () => {
    const runs: PipelineRun[] = [
      makeRun({ id: 1, status: 'success', duration: 60_000 }),
      makeRun({ id: 2, status: 'success', duration: 90_000 }),
      makeRun({ id: 3, status: 'failure', duration: 30_000 }),
      makeRun({ id: 4, status: 'cancelled', duration: null }),
    ];
    const stats = calculateStats(runs);

    expect(stats.totalRuns).toBe(4);
    expect(stats.successRuns).toBe(2);
    expect(stats.failureRuns).toBe(1);
    expect(stats.cancelledRuns).toBe(1);

    // successRate = 2/4 * 100 = 50.0
    expect(stats.successRate).toBe(50);
    // failureRate = 1/4 * 100 = 25.0
    expect(stats.failureRate).toBe(25);

    // avgDuration of runs with non-null duration: (60_000 + 90_000 + 30_000) / 3 = 60_000
    expect(stats.avgDuration).toBe(60_000);
  });

  it('returns null avgDuration when all runs have null duration', () => {
    const runs: PipelineRun[] = [
      makeRun({ duration: null }),
      makeRun({ id: 2, duration: null }),
    ];
    const stats = calculateStats(runs);
    expect(stats.avgDuration).toBeNull();
  });

  it('rounds rates to one decimal place', () => {
    // 1 of 3 success → 33.333... % → rounds to 33.3
    const runs: PipelineRun[] = [
      makeRun({ id: 1, status: 'success' }),
      makeRun({ id: 2, status: 'failure' }),
      makeRun({ id: 3, status: 'failure' }),
    ];
    const stats = calculateStats(runs);
    expect(stats.successRate).toBeCloseTo(33.3, 1);
    expect(stats.failureRate).toBeCloseTo(66.7, 1);
  });
});

// ---------------------------------------------------------------------------
// calculateTrends
// ---------------------------------------------------------------------------
describe('calculateTrends', () => {
  it('returns 7 data points for 7d period with no runs (total===0 branch)', () => {
    const trends = calculateTrends([], '7d');
    expect(trends.period).toBe('7d');
    expect(trends.dataPoints).toHaveLength(7);
    trends.dataPoints.forEach((dp) => {
      expect(dp.total).toBe(0);
      expect(dp.successRate).toBe(0);
    });
  });

  it('returns 30 data points for 30d period', () => {
    const trends = calculateTrends([], '30d');
    expect(trends.dataPoints).toHaveLength(30);
  });

  it('returns 90 data points for 90d period', () => {
    const trends = calculateTrends([], '90d');
    expect(trends.dataPoints).toHaveLength(90);
  });

  it('groups runs by date and computes daily successRate rounded to 1 decimal', () => {
    // Use a date that will definitely be within the last 7 days relative to "now"
    const today = new Date();
    today.setDate(today.getDate() - 1); // yesterday is safely in 7d window
    const dateStr = today.toISOString().split('T')[0];
    const dayIso = `${dateStr}T10:00:00Z`;

    const runs: PipelineRun[] = [
      makeRun({ id: 1, status: 'success', startedAt: dayIso }),
      makeRun({ id: 2, status: 'success', startedAt: dayIso }),
      makeRun({ id: 3, status: 'failure', startedAt: dayIso }),
    ];

    const trends = calculateTrends(runs, '7d');
    const dayPoint = trends.dataPoints.find((dp) => dp.date === dateStr);

    expect(dayPoint).toBeDefined();
    expect(dayPoint!.total).toBe(3);
    expect(dayPoint!.success).toBe(2);
    expect(dayPoint!.failure).toBe(1);
    // successRate = 2/3 * 100 ≈ 66.7
    expect(dayPoint!.successRate).toBeCloseTo(66.7, 1);
  });

  it('sets successRate to 0 when the day has no runs (total===0 guard)', () => {
    // Provide no runs → all days have total=0 and successRate=0
    const trends = calculateTrends([], '7d');
    trends.dataPoints.forEach((dp) => {
      expect(dp.total).toBe(0);
      expect(dp.successRate).toBe(0);
    });
  });

  it('includes aggregated stats for the period', () => {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const dayIso = `${today.toISOString().split('T')[0]}T10:00:00Z`;

    const runs: PipelineRun[] = [
      makeRun({ id: 1, status: 'success', startedAt: dayIso, duration: 60_000 }),
      makeRun({ id: 2, status: 'failure', startedAt: dayIso, duration: 120_000 }),
    ];

    const trends = calculateTrends(runs, '7d');
    expect(trends.stats.totalRuns).toBe(2);
    expect(trends.stats.successRate).toBe(50);
    expect(trends.stats.failureRate).toBe(50);
  });
});
