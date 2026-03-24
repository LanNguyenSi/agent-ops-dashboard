"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "./AgentCard";
import type { AgentActivity, Agent } from "@/lib/agents/types";

interface GatewayAgent {
  id: string;
  name: string;
  status: "online" | "offline" | "idle" | "busy";
  lastSeen: string;
  currentTask?: string;
  tags: string[];
  registeredAt: string;
}

function toAgentActivity(agents: GatewayAgent[]): AgentActivity {
  const mapped: Agent[] = agents.map((g) => ({
    id: g.id,
    name: g.name,
    status: g.status === "busy" ? "online" : g.status,
    lastMessage: g.currentTask || null,
    lastMessageAt: g.lastSeen,
    connectedAt: g.registeredAt,
    uptime: Date.now() - new Date(g.registeredAt).getTime(),
    platform: g.tags.join(", ") || "agent-ops",
  }));
  return {
    agents: mapped,
    totalAgents: mapped.length,
    onlineAgents: mapped.filter((a) => a.status === "online").length,
    offlineAgents: mapped.filter((a) => a.status === "offline").length,
    lastUpdate: new Date().toISOString(),
  };
}

export function AgentBar() {
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/gateway/agents");
        if (res.ok) {
          const agents: GatewayAgent[] = await res.json();
          setActivity(toAgentActivity(agents));
          setError(null);
          setLoading(false);
          return;
        }
      } catch {}

      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          setActivity(data);
          setError(null);
          setLoading(false);
          return;
        }
      } catch {}

      setError("Could not reach agent data source");
      setLoading(false);
    }

    fetchAgents();
    const interval = setInterval(fetchAgents, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <span className="text-sm text-slate-400">Loading agents…</span>;
  }

  if (error) {
    return <span className="text-sm text-rose-500">{error}</span>;
  }

  if (!activity || activity.agents.length === 0) {
    return <span className="text-sm text-slate-400">No agents registered</span>;
  }

  return (
    <div className="agent-bar-wrapper">
      <button
        onClick={() => setExpanded(!expanded)}
        className="agent-bar-toggle"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">
            {activity.totalAgents} {activity.totalAgents === 1 ? "Agent" : "Agents"}
          </span>
          <span className="flex items-center gap-1.5">
            {activity.onlineAgents > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {activity.onlineAgents} online
              </span>
            )}
            {activity.offlineAgents > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                {activity.offlineAgents} offline
              </span>
            )}
          </span>
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="agent-bar-panel">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activity.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
