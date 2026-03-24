export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  repository?: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  source: string;
  repository?: string;
  url?: string;
  ruleId?: string; // ID of the rule that generated this alert
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
}
