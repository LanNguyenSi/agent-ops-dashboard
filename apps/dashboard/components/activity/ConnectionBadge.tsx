"use client";

interface ConnectionBadgeProps {
  isConnected: boolean;
  error: string | null;
}

export function ConnectionBadge({ isConnected, error }: ConnectionBadgeProps) {
  if (isConnected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Live
      </span>
    );
  }

  return (
    <span
      title={error ?? "Disconnected"}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2.5 py-0.5"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      {error ? "Reconnecting..." : "Disconnected"}
    </span>
  );
}
