import type { Alert, AlertSeverity } from "./types";
import type { PipelineRun } from "../pipeline/types";
import type { Agent } from "../agents/types";

/**
 * Alert rule condition types
 */
export type AlertCondition =
  | "pipeline_failure"
  | "high_failure_rate"
  | "agent_offline"
  | "slow_builds";

/**
 * Alert rule definition
 */
export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  threshold?: number; // e.g., failure rate > 50%, offline > 30 min
  repos?: string[]; // apply only to specific repos
  severity: AlertSeverity;
  enabled: boolean;
  description: string;
}

/**
 * Context data for rule evaluation
 */
export interface RuleEvaluationContext {
  pipelineRuns?: PipelineRun[];
  agents?: Agent[];
  timestamp?: string;
}

/**
 * Default alert rules
 */
export const DEFAULT_RULES: AlertRule[] = [
  {
    id: "pipeline-failure",
    name: "Pipeline Failure",
    condition: "pipeline_failure",
    severity: "critical",
    enabled: true,
    description: "Alert when any pipeline run fails",
  },
  {
    id: "high-failure-rate",
    name: "High Failure Rate",
    condition: "high_failure_rate",
    threshold: 50, // 50% failure rate
    severity: "warning",
    enabled: true,
    description: "Alert when failure rate exceeds threshold in recent runs",
  },
  {
    id: "agent-offline",
    name: "Agent Offline",
    condition: "agent_offline",
    threshold: 30, // 30 minutes
    severity: "critical",
    enabled: true,
    description: "Alert when agent is offline for more than threshold minutes",
  },
  {
    id: "slow-builds",
    name: "Slow Builds",
    condition: "slow_builds",
    threshold: 10, // 10 minutes average
    severity: "warning",
    enabled: true,
    description: "Alert when average build duration exceeds threshold",
  },
];

/**
 * Evaluate all enabled rules and generate alerts
 */
export function evaluateRules(
  rules: AlertRule[],
  context: RuleEvaluationContext
): Alert[] {
  const alerts: Alert[] = [];
  const now = context.timestamp || new Date().toISOString();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const ruleAlerts = evaluateRule(rule, context, now);
    alerts.push(...ruleAlerts);
  }

  return alerts;
}

/**
 * Evaluate a single rule
 */
function evaluateRule(
  rule: AlertRule,
  context: RuleEvaluationContext,
  timestamp: string
): Alert[] {
  switch (rule.condition) {
    case "pipeline_failure":
      return evaluatePipelineFailure(rule, context, timestamp);
    case "high_failure_rate":
      return evaluateHighFailureRate(rule, context, timestamp);
    case "agent_offline":
      return evaluateAgentOffline(rule, context, timestamp);
    case "slow_builds":
      return evaluateSlowBuilds(rule, context, timestamp);
    default:
      return [];
  }
}

/**
 * Pipeline failure rule: Alert on each failed pipeline run
 */
function evaluatePipelineFailure(
  rule: AlertRule,
  context: RuleEvaluationContext,
  timestamp: string
): Alert[] {
  if (!context.pipelineRuns) return [];

  const alerts: Alert[] = [];

  for (const run of context.pipelineRuns) {
    // Skip if not a failure
    if (run.conclusion !== "failure") continue;

    // Skip if not completed
    if (!run.completedAt) continue;

    // Skip if repo filter doesn't match
    if (rule.repos && !rule.repos.includes(run.repository)) continue;

    alerts.push({
      id: `${rule.id}-${run.id}`,
      severity: rule.severity,
      status: "active",
      title: `${rule.name}: ${run.name}`,
      message: `${run.repository} - ${run.branch} - ${run.commitMessage}`,
      source: "github-actions",
      repository: run.repository,
      url: run.htmlUrl,
      ruleId: rule.id,
      createdAt: run.completedAt || timestamp,
    });
  }

  return alerts;
}

/**
 * High failure rate rule: Alert when failure rate exceeds threshold
 */
function evaluateHighFailureRate(
  rule: AlertRule,
  context: RuleEvaluationContext,
  timestamp: string
): Alert[] {
  if (!context.pipelineRuns) return [];
  if (!rule.threshold) return [];

  const alerts: Alert[] = [];

  // Group by repository
  const repoRuns = new Map<string, PipelineRun[]>();
  for (const run of context.pipelineRuns) {
    if (!repoRuns.has(run.repository)) {
      repoRuns.set(run.repository, []);
    }
    repoRuns.get(run.repository)!.push(run);
  }

  // Calculate failure rate per repo
  for (const [repo, runs] of repoRuns) {
    // Skip if repo filter doesn't match
    if (rule.repos && !rule.repos.includes(repo)) continue;

    // Only consider completed runs
    const completedRuns = runs.filter((r) => r.completedAt);
    if (completedRuns.length === 0) continue;

    // Calculate failure rate
    const failures = completedRuns.filter((r) => r.conclusion === "failure").length;
    const failureRate = (failures / completedRuns.length) * 100;

    // Alert if threshold exceeded
    if (failureRate > rule.threshold) {
      alerts.push({
        id: `${rule.id}-${repo}`,
        severity: rule.severity,
        status: "active",
        title: `${rule.name}: ${repo}`,
        message: `Failure rate is ${failureRate.toFixed(1)}% (${failures}/${completedRuns.length} runs)`,
        source: "alert-rule",
        repository: repo,
        ruleId: rule.id,
        createdAt: timestamp,
      });
    }
  }

  return alerts;
}

/**
 * Agent offline rule: Alert when agent is offline for too long
 */
function evaluateAgentOffline(
  rule: AlertRule,
  context: RuleEvaluationContext,
  timestamp: string
): Alert[] {
  if (!context.agents) return [];
  if (!rule.threshold) return [];

  const alerts: Alert[] = [];
  const thresholdMs = rule.threshold * 60 * 1000; // convert minutes to ms

  for (const agent of context.agents) {
    // Only alert for offline agents
    if (agent.status !== "offline") continue;

    // Calculate how long agent has been offline
    const lastSeen = agent.lastMessageAt || agent.connectedAt;
    const offlineDuration = Date.now() - new Date(lastSeen).getTime();

    // Alert if offline longer than threshold
    if (offlineDuration > thresholdMs) {
      const offlineMinutes = Math.floor(offlineDuration / 60000);
      alerts.push({
        id: `${rule.id}-${agent.id}`,
        severity: rule.severity,
        status: "active",
        title: `${rule.name}: ${agent.name}`,
        message: `Agent has been offline for ${offlineMinutes} minutes (threshold: ${rule.threshold}m)`,
        source: "triologue",
        ruleId: rule.id,
        createdAt: timestamp,
      });
    }
  }

  return alerts;
}

/**
 * Slow builds rule: Alert when average build duration exceeds threshold
 */
function evaluateSlowBuilds(
  rule: AlertRule,
  context: RuleEvaluationContext,
  timestamp: string
): Alert[] {
  if (!context.pipelineRuns) return [];
  if (!rule.threshold) return [];

  const alerts: Alert[] = [];
  const thresholdMs = rule.threshold * 60 * 1000; // convert minutes to ms

  // Group by repository
  const repoRuns = new Map<string, PipelineRun[]>();
  for (const run of context.pipelineRuns) {
    if (!repoRuns.has(run.repository)) {
      repoRuns.set(run.repository, []);
    }
    repoRuns.get(run.repository)!.push(run);
  }

  // Calculate average duration per repo
  for (const [repo, runs] of repoRuns) {
    // Skip if repo filter doesn't match
    if (rule.repos && !rule.repos.includes(repo)) continue;

    // Only consider completed runs with duration
    const runsWithDuration = runs.filter((r) => r.duration !== null);
    if (runsWithDuration.length === 0) continue;

    // Calculate average duration
    const totalDuration = runsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = totalDuration / runsWithDuration.length;

    // Alert if average exceeds threshold
    if (avgDuration > thresholdMs) {
      const avgMinutes = Math.floor(avgDuration / 60000);
      alerts.push({
        id: `${rule.id}-${repo}`,
        severity: rule.severity,
        status: "active",
        title: `${rule.name}: ${repo}`,
        message: `Average build time is ${avgMinutes} minutes (threshold: ${rule.threshold}m, based on ${runsWithDuration.length} runs)`,
        source: "alert-rule",
        repository: repo,
        ruleId: rule.id,
        createdAt: timestamp,
      });
    }
  }

  return alerts;
}

/**
 * Get rule by ID
 */
export function getRuleById(rules: AlertRule[], id: string): AlertRule | undefined {
  return rules.find((r) => r.id === id);
}

/**
 * Get enabled rules only
 */
export function getEnabledRules(rules: AlertRule[]): AlertRule[] {
  return rules.filter((r) => r.enabled);
}
