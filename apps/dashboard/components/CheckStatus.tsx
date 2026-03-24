interface CheckStatusProps {
  status: "success" | "failure" | "pending" | "unknown";
  size?: "sm" | "md" | "lg";
}

export function CheckStatus({ status, size = "md" }: CheckStatusProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };
  
  const statusConfig = {
    success: {
      label: "Passing",
      className: "bg-green-100 text-green-800 border-green-300",
    },
    failure: {
      label: "Failing",
      className: "bg-red-100 text-red-800 border-red-300",
    },
    pending: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    unknown: {
      label: "Unknown",
      className: "bg-gray-100 text-gray-800 border-gray-300",
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
