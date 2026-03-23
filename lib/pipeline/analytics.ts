import type { PipelineRun, PipelineStats, PipelineTrends, TrendDataPoint } from "./types";

export function calculateStats(runs: PipelineRun[]): PipelineStats {
  const totalRuns = runs.length;
  const successRuns = runs.filter((r) => r.status === "success").length;
  const failureRuns = runs.filter((r) => r.status === "failure").length;
  const cancelledRuns = runs.filter((r) => r.status === "cancelled").length;
  
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;
  const failureRate = totalRuns > 0 ? (failureRuns / totalRuns) * 100 : 0;
  
  const completedRuns = runs.filter((r) => r.duration !== null);
  const avgDuration = completedRuns.length > 0
    ? completedRuns.reduce((sum, r) => sum + (r.duration || 0), 0) / completedRuns.length
    : null;
  
  return {
    totalRuns,
    successRuns,
    failureRuns,
    cancelledRuns,
    successRate: Math.round(successRate * 10) / 10,
    failureRate: Math.round(failureRate * 10) / 10,
    avgDuration: avgDuration ? Math.round(avgDuration) : null,
  };
}

export function calculateTrends(runs: PipelineRun[], period: "7d" | "30d" | "90d" = "7d"): PipelineTrends {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  
  // Filter runs within period
  const periodRuns = runs.filter((run) => {
    const runDate = new Date(run.startedAt);
    return runDate >= startDate && runDate <= now;
  });
  
  // Group by date
  const dataByDate = new Map<string, TrendDataPoint>();
  
  // Initialize all dates in range
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split("T")[0];
    dataByDate.set(dateKey, {
      date: dateKey,
      success: 0,
      failure: 0,
      total: 0,
      successRate: 0,
    });
  }
  
  // Count runs per date
  for (const run of periodRuns) {
    const dateKey = run.startedAt.split("T")[0];
    const dataPoint = dataByDate.get(dateKey);
    if (!dataPoint) continue;
    
    dataPoint.total++;
    if (run.status === "success") {
      dataPoint.success++;
    } else if (run.status === "failure") {
      dataPoint.failure++;
    }
    
    dataPoint.successRate = dataPoint.total > 0
      ? Math.round((dataPoint.success / dataPoint.total) * 100 * 10) / 10
      : 0;
  }
  
  const dataPoints = Array.from(dataByDate.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );
  
  return {
    period,
    dataPoints,
    stats: calculateStats(periodRuns),
  };
}
