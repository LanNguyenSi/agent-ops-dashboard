"use client";

import { useMemo, useState, useEffect } from "react";
import { useActivityStream, type ActivityFilters } from "./useActivityStream";
import { EventCard } from "./EventCard";
import { EventFilters } from "./EventFilters";
import { ConnectionBadge } from "./ConnectionBadge";

interface Agent {
  id: string;
  name: string;
}

export function ActivityFeed() {
  const [filters, setFilters] = useState<ActivityFilters>({});
  const { events, isConnected, error, clearEvents } = useActivityStream(filters);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  // Fetch agent list to resolve IDs → names
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/gateway/agents");
        if (!res.ok) return;
        const agents: Agent[] = await res.json();
        const map: Record<string, string> = {};
        for (const a of agents) map[a.id] = a.name;
        setAgentNames(map);
      } catch {}
    }
    loadAgents();
    // Refresh every 30s to pick up newly registered agents
    const interval = setInterval(loadAgents, 30_000);
    return () => clearInterval(interval);
  }, []);

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
        agentNames={agentNames}
      />

      {events.length === 0 ? (
        <div className="text-center text-gray-400 py-12 text-sm">
          {isConnected ? "Waiting for events..." : "Connecting..."}
        </div>
      ) : (
        <div className="space-y-1.5">
          {events.map((event) => (
            <EventCard key={event.id} event={event} agentNames={agentNames} />
          ))}
        </div>
      )}
    </div>
  );
}
