import type { PollState } from "@/lib/polling/types";

interface RefreshIndicatorProps {
  state: PollState;
  onRefresh: () => void;
}

export function RefreshIndicator({ state, onRefresh }: RefreshIndicatorProps) {
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 10) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="flex items-center gap-3 text-sm text-gray-600">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            state.isPolling
              ? "bg-blue-500 animate-pulse"
              : state.error
              ? "bg-red-500"
              : "bg-green-500"
          }`}
        />
        <span>
          {state.isPolling
            ? "Updating..."
            : state.error
            ? "Error"
            : "Live"}
        </span>
      </div>

      {/* Last Update */}
      <span className="text-gray-500">
        Last update: {formatLastUpdate(state.lastUpdate)}
      </span>

      {/* Manual Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={state.isPolling}
        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Refresh now"
      >
        <svg
          className={`w-4 h-4 ${state.isPolling ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
