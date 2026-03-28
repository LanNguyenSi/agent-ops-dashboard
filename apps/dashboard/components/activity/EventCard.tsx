"use client";

import type { AgentEvent } from "./useActivityStream";

const EVENT_COLORS: Record<string, string> = {
  "agent.registered":   "border-l-blue-500",
  "agent.heartbeat":    "border-l-green-500",
  "agent.disconnected": "border-l-gray-400",
  "state.set":          "border-l-violet-500",
  "state.deleted":      "border-l-red-400",
  "state.cas.success":  "border-l-emerald-500",
  "state.cas.conflict": "border-l-amber-500",
};

interface EventCardProps {
  event: AgentEvent;
  agentNames?: Record<string, string>;
}

export function EventCard({ event, agentNames = {} }: EventCardProps) {
  const colorClass =
    EVENT_COLORS[event.eventType] ?? "border-l-gray-300";
  const time = new Date(event.createdAt).toLocaleTimeString();
  const payloadStr = JSON.stringify(event.payload);
  const truncated =
    payloadStr.length > 120 ? payloadStr.slice(0, 117) + "…" : payloadStr;

  const agentLabel = event.agentId
    ? (agentNames[event.agentId] ?? event.agentId.slice(0, 8) + "…")
    : null;

  return (
    <div
      className={`data-card border-l-4 ${colorClass} p-3 flex items-start gap-3`}
      style={{ borderRadius: "0.2rem 1.1rem 1.1rem 0.2rem" }}
    >
      <span className="text-xs whitespace-nowrap font-mono mt-0.5" style={{ color: "var(--subtle)" }}>
        {time}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {agentLabel && (
            <span className="pill-label text-xs font-semibold">
              {agentLabel}
            </span>
          )}
          <span className="text-xs font-mono font-medium" style={{ color: "var(--text)" }}>
            {event.eventType}
          </span>
        </div>
        <p className="text-xs mt-0.5 font-mono truncate" style={{ color: "var(--muted)" }}>
          {truncated}
        </p>
      </div>
      <span className="text-xs font-mono" style={{ color: "var(--subtle)" }}>#{event.id}</span>
    </div>
  );
}
