"use client";

import type { ActivityFilters } from "./useActivityStream";

const EVENT_TYPES = [
  "agent.registered",
  "agent.heartbeat",
  "agent.disconnected",
  "state.set",
  "state.deleted",
  "state.cas.success",
  "state.cas.conflict",
];

interface EventFiltersProps {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
  agentIds: string[];
  agentNames?: Record<string, string>;
}

export function EventFilters({ filters, onChange, agentIds, agentNames = {} }: EventFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        value={filters.agentId ?? ""}
        onChange={(e) =>
          onChange({ ...filters, agentId: e.target.value || undefined })
        }
        className="rounded border border-gray-300 px-3 py-1.5 text-sm bg-white"
      >
        <option value="">All Agents</option>
        {agentIds.map((id) => (
          <option key={id} value={id}>{agentNames[id] ?? id.slice(0, 8) + "…"}
            {id}
          </option>
        ))}
      </select>

      <select
        value={filters.eventType ?? ""}
        onChange={(e) =>
          onChange({ ...filters, eventType: e.target.value || undefined })
        }
        className="rounded border border-gray-300 px-3 py-1.5 text-sm bg-white"
      >
        <option value="">All Event Types</option>
        {EVENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
