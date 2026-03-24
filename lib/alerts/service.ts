import type { Alert, AlertStats } from "./types";
import { getMockAlerts, getAlertStats as getMockAlertStats } from "./mock-data";
import { getPipelineRuns } from "../pipeline/service";

/**
 * Get alerts derived from real pipeline failures + mock alerts
 * In production, this would fetch from database with Prisma
 */
export async function getAlerts(): Promise<Alert[]> {
  const reposEnv = process.env.GITHUB_REPOS;
  
  // If no GitHub repos configured, return mock alerts
  if (!reposEnv) {
    return getMockAlerts();
  }
  
  try {
    // Fetch recent pipeline runs
    const runs = await getPipelineRuns({ limit: 20 });
    
    // Generate alerts from failures
    const pipelineAlerts: Alert[] = runs
      .filter(run => run.conclusion === "failure" && run.completedAt)
      .map(run => ({
        id: `pipeline-${run.id}`,
        severity: "critical" as const,
        status: "active" as const,
        title: `Pipeline Failed: ${run.name}`,
        message: `${run.repository} - ${run.branch} - ${run.commitMessage}`,
        source: "github-actions",
        repository: run.repository,
        url: run.htmlUrl,
        createdAt: run.completedAt || run.startedAt,
      }));
    
    // Combine with mock alerts (for now, until we have real alert rules)
    // In production, this would be database alerts
    const mockAlerts = getMockAlerts().slice(0, 3); // Keep a few mock alerts
    
    return [...pipelineAlerts, ...mockAlerts];
  } catch (error) {
    console.error("Failed to generate alerts from pipeline:", error);
    return getMockAlerts();
  }
}

export async function getStats(): Promise<AlertStats> {
  const alerts = await getAlerts();
  
  return {
    total: alerts.length,
    active: alerts.filter(a => a.status === "active").length,
    acknowledged: alerts.filter(a => a.status === "acknowledged").length,
    resolved: alerts.filter(a => a.status === "resolved").length,
  };
}

export async function getAlert(id: string): Promise<Alert | null> {
  const alerts = await getAlerts();
  return alerts.find((a) => a.id === id) || null;
}

// TODO: Implement with Prisma for production
export async function acknowledgeAlert(id: string, acknowledgedBy: string): Promise<Alert | null> {
  console.log(`Mock: Acknowledge alert ${id} by ${acknowledgedBy}`);
  return null;
}

export async function resolveAlert(id: string): Promise<Alert | null> {
  console.log(`Mock: Resolve alert ${id}`);
  return null;
}
