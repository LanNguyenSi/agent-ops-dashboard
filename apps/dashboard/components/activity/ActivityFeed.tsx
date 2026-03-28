"use client";

import { useMemo, useState } from "react";
import { useActivityStream, type ActivityFilters } from "./useActivityStream";
import { EventCard } from "./EventCard";
import { EventFilters } from "./EventFilters";
import { ConnectionBadge } from "./ConnectionBadge";

export function ActivityFeed() {
  const [filters, setFilters] = useState<ActivityFilters>({});
  const { events, isConnected, error, clearEvents } = useActivityStream(filters);

  const agentIds = useMemo(
    () => [
      ...new Set(
        events.map((e) => e.agentId).filter(Boolean) as string[]
      ),
    ],
    [events]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Activity Feed</h2>
        <div className="flex items-center gap-3">
          <ConnectionBadge isConnected={isConnected} error={error} />
          <button
            onClick={clearEvents}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        </div>
      </div>

      <EventFilters
        filters={filters}
        onChange={setFilters}
        agentIds={agentIds}
      />

      {events.length === 0 ? (
        <div className="text-center text-gray-400 py-12 text-sm">
          {isConnected ? "Waiting for events..." : "Connecting..."}
        </div>
      ) : (
        <div className="space-y-1.5">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
