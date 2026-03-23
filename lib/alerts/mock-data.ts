import type { Alert, AlertStats } from "./types";

// Mock alert data for MVP
export function getMockAlerts(): Alert[] {
  const now = new Date();
  
  return [
    {
      id: "alert-001",
      severity: "critical",
      status: "active",
      title: "Pipeline failing on master branch",
      message: "agent-planforge master branch has 3 consecutive failures. Last run: PR #25 merge.",
      source: "GitHub Actions",
      repository: "LanNguyenSi/agent-planforge",
      url: "https://github.com/LanNguyenSi/agent-planforge/actions",
      createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 min ago
    },
    {
      id: "alert-002",
      severity: "warning",
      status: "acknowledged",
      title: "Slow build times detected",
      message: "scaffoldkit builds taking >10 minutes on average (threshold: 5 min).",
      source: "GitHub Actions",
      repository: "LanNguyenSi/scaffoldkit",
      url: "https://github.com/LanNguyenSi/scaffoldkit/actions",
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
      acknowledgedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1h ago
      acknowledgedBy: "ice",
    },
    {
      id: "alert-003",
      severity: "info",
      status: "resolved",
      title: "Deployment completed successfully",
      message: "agent-ops-dashboard deployed to production. All checks passed.",
      source: "GitHub Actions",
      repository: "LanNguyenSi/agent-ops-dashboard",
      url: "https://github.com/LanNguyenSi/agent-ops-dashboard/actions",
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
      resolvedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
    },
    {
      id: "alert-004",
      severity: "warning",
      status: "active",
      title: "High PR review backlog",
      message: "8 open PRs without review for >48h in agent-planforge.",
      source: "GitHub",
      repository: "LanNguyenSi/agent-planforge",
      url: "https://github.com/LanNguyenSi/agent-planforge/pulls",
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
    },
    {
      id: "alert-005",
      severity: "critical",
      status: "acknowledged",
      title: "Test coverage below threshold",
      message: "Code coverage dropped to 45% (threshold: 80%). 12 new files without tests.",
      source: "CI/CD",
      repository: "LanNguyenSi/scaffoldkit",
      url: "https://github.com/LanNguyenSi/scaffoldkit",
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
      acknowledgedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8h ago
      acknowledgedBy: "lava",
    },
  ];
}

export function getAlertStats(): AlertStats {
  const alerts = getMockAlerts();
  
  return {
    total: alerts.length,
    active: alerts.filter((a) => a.status === "active").length,
    acknowledged: alerts.filter((a) => a.status === "acknowledged").length,
    resolved: alerts.filter((a) => a.status === "resolved").length,
  };
}
