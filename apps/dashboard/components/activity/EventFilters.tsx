"use client";

import { useMemo } from "react";
import { Select } from "@/components/Select";
import type { ActivityFilters } from "./useActivityStream";

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All Event Types" },
  { value: "agent.registered", label: "agent.registered" },
  { value: "agent.heartbeat", label: "agent.heartbeat" },
  { value: "agent.disconnected", label: "agent.disconnected" },
  { value: "state.set", label: "state.set" },
  { value: "state.deleted", label: "state.deleted" },
  { value: "state.cas.success", label: "state.cas.success" },
  { value: "state.cas.conflict", label: "state.cas.conflict" },
];

interface EventFiltersProps {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
  agentIds: string[];
  agentNames?: Record<string, string>;
}

export function EventFilters({ filters, onChange, agentIds, agentNames = {} }: EventFiltersProps) {
  const agentOptions = useMemo(
    () => [
      { value: "", label: "All Agents" },
      ...agentIds.map((id) => ({
        value: id,
        label: agentNames[id] ?? id.slice(0, 8) + "…",
      })),
    ],
    [agentIds, agentNames],
  );

  return (
    <div className="flex flex-wrap gap-3 mb-5">
      <Select
        value={filters.agentId ?? ""}
        onChange={(v) => onChange({ ...filters, agentId: v || undefined })}
        options={agentOptions}
        placeholder="All Agents"
        className="w-44"
      />
      <Select
        value={filters.eventType ?? ""}
        onChange={(v) => onChange({ ...filters, eventType: v || undefined })}
        options={EVENT_TYPE_OPTIONS}
        placeholder="All Event Types"
        className="w-48"
      />
    </div>
  );
}
