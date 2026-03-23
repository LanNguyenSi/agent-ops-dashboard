export type PipelineStatus = "success" | "failure" | "in_progress" | "cancelled" | "skipped";

export interface PipelineRun {
  id: number;
  name: string;
  status: PipelineStatus;
  conclusion: string | null;
  repository: string;
  branch: string;
  commit: string;
  commitMessage: string;
  author: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null; // milliseconds
  htmlUrl: string;
}

export interface PipelineStats {
  totalRuns: number;
  successRuns: number;
  failureRuns: number;
  cancelledRuns: number;
  successRate: number; // percentage
  failureRate: number; // percentage
  avgDuration: number | null; // milliseconds
}

export interface TrendDataPoint {
  date: string; // YYYY-MM-DD
  success: number;
  failure: number;
  total: number;
  successRate: number;
}

export interface PipelineTrends {
  period: "7d" | "30d" | "90d";
  dataPoints: TrendDataPoint[];
  stats: PipelineStats;
}

export interface PipelineFilters {
  repository?: string;
  branch?: string;
  status?: PipelineStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
}
