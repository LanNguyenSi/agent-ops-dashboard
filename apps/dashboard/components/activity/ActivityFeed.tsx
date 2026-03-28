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
      <div className="section-header">
        <div>
          <p className="section-kicker">Live Stream</p>
          <h2 className="section-title">Activity Feed</h2>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge isConnected={isConnected} error={error} />
          <button
            onClick={clearEvents}
            className="pill-label cursor-pointer hover:border-[var(--line-strong)] transition-colors"
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
        <div className="empty-state">
          {isConnected ? "Waiting for events…" : "Connecting…"}
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} agentNames={agentNames} />
          ))}
        </div>
      )}
    </div>
  );
}
