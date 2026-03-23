import type { AlertSeverity, AlertStatus } from "@/lib/alerts/types";

interface AlertBadgeProps {
  severity?: AlertSeverity;
  status?: AlertStatus;
  size?: "sm" | "md";
}

export function AlertBadge({ severity, status, size = "md" }: AlertBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };
  
  // Show severity badge
  if (severity) {
    const severityConfig = {
      critical: {
        label: "Critical",
        className: "bg-red-100 text-red-800 border-red-300",
      },
      warning: {
        label: "Warning",
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
      },
      info: {
        label: "Info",
        className: "bg-blue-100 text-blue-800 border-blue-300",
      },
    };
    
    const config = severityConfig[severity];
    
    return (
      <span
        className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${config.className}`}
      >
        {config.label}
      </span>
    );
  }
  
  // Show status badge
  if (status) {
    const statusConfig = {
      active: {
        label: "Active",
        className: "bg-red-100 text-red-800 border-red-300",
      },
      acknowledged: {
        label: "Acknowledged",
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
      },
      resolved: {
        label: "Resolved",
        className: "bg-green-100 text-green-800 border-green-300",
      },
    };
    
    const config = statusConfig[status];
    
    return (
      <span
        className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${config.className}`}
      >
        {config.label}
      </span>
    );
  }
  
  return null;
}
