"use client";

import type { AgentEvent } from "./useActivityStream";

const EVENT_COLORS: Record<string, string> = {
  "agent.registered":   "border-l-blue-500 bg-blue-50",
  "agent.heartbeat":    "border-l-green-500 bg-green-50",
  "agent.disconnected": "border-l-gray-400 bg-gray-50",
  "state.set":          "border-l-violet-500 bg-violet-50",
  "state.deleted":      "border-l-red-400 bg-red-50",
  "state.cas.success":  "border-l-emerald-500 bg-emerald-50",
  "state.cas.conflict": "border-l-amber-500 bg-amber-50",
};

interface EventCardProps {
  event: AgentEvent;
  agentNames?: Record<string, string>;
}

export function EventCard({ event, agentNames = {} }: EventCardProps) {
  const colorClass =
    EVENT_COLORS[event.eventType] ?? "border-l-gray-300 bg-gray-50";
  const time = new Date(event.createdAt).toLocaleTimeString();
  const payloadStr = JSON.stringify(event.payload);
  const truncated =
    payloadStr.length > 120 ? payloadStr.slice(0, 117) + "..." : payloadStr;

  const agentLabel = event.agentId
    ? (agentNames[event.agentId] ?? event.agentId.slice(0, 8) + "…")
    : null;

  return (
    <div
      className={`border-l-4 rounded-r p-3 ${colorClass} flex items-start gap-3`}
    >
      <span className="text-xs text-gray-500 whitespace-nowrap font-mono mt-0.5">
        {time}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {agentLabel && (
            <span className="text-xs font-semibold text-gray-700 bg-gray-200 rounded px-1.5 py-0.5">
              {agentLabel}
            </span>
          )}
          <span className="text-xs font-mono font-medium text-gray-800">
            {event.eventType}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">
          {truncated}
        </p>
      </div>
      <span className="text-xs text-gray-400 font-mono">#{event.id}</span>
    </div>
  );
}
