import { AlertBadge } from "./AlertBadge";
import type { Alert } from "@/lib/alerts/types";
import { DEFAULT_RULES, getRuleById } from "@/lib/alerts/rules";

interface AlertCardProps {
  alert: Alert;
}

export function AlertCard({ alert }: AlertCardProps) {
  // Get rule details if this alert was triggered by a rule
  const rule = alert.ruleId ? getRuleById(DEFAULT_RULES, alert.ruleId) : null;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <AlertBadge severity={alert.severity} size="sm" />
            <AlertBadge status={alert.status} size="sm" />
          </div>
          <h3 className="font-semibold text-gray-900">{alert.title}</h3>
          {alert.repository && (
            <p className="text-sm text-gray-600">{alert.repository}</p>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3">{alert.message}</p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div>
          <span className="font-medium">{alert.source}</span>
          {rule && (
            <>
              {" · "}
              <span className="text-gray-600" title={rule.description}>
                Rule: {rule.name}
              </span>
            </>
          )}
          {alert.url && (
            <>
              {" · "}
              <a
                href={alert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View
              </a>
            </>
          )}
        </div>
        <span>{formatTimestamp(alert.createdAt)}</span>
      </div>

      {alert.acknowledgedBy && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
          Acknowledged by {alert.acknowledgedBy} {formatTimestamp(alert.acknowledgedAt!)}
        </div>
      )}
    </div>
  );
}
