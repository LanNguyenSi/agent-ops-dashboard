import type { PipelineStatus } from "@/lib/pipeline/types";

interface StatusBadgeProps {
  status: PipelineStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };
  
  const statusConfig = {
    success: {
      label: "Success",
      className: "bg-green-100 text-green-800 border-green-300",
    },
    failure: {
      label: "Failure",
      className: "bg-red-100 text-red-800 border-red-300",
    },
    in_progress: {
      label: "Running",
      className: "bg-blue-100 text-blue-800 border-blue-300",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-gray-100 text-gray-800 border-gray-300",
    },
    skipped: {
      label: "Skipped",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
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
