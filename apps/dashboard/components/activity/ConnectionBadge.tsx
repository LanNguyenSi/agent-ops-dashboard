"use client";

interface ConnectionBadgeProps {
  isConnected: boolean;
  error: string | null;
}

export function ConnectionBadge({ isConnected, error }: ConnectionBadgeProps) {
  if (isConnected) {
    return (
      <span className="pill-label inline-flex items-center gap-1.5 text-green-700 border-green-200 bg-green-50/80">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Live
      </span>
    );
  }

  return (
    <span
      title={error ?? "Disconnected"}
      className="pill-label inline-flex items-center gap-1.5 text-amber-700 border-amber-200 bg-amber-50/80"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      {error ? "Reconnecting…" : "Disconnected"}
    </span>
  );
}
