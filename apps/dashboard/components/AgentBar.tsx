"use client";

import { useEffect, useState } from "react";
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

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-slate-300",
  idle: "bg-amber-400",
};

function AgentRow({ agent }: { agent: Agent }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[agent.status] ?? "bg-slate-300"}`} />
      <span className="text-sm font-medium text-slate-800 truncate max-w-[120px]">{agent.name}</span>
      {agent.lastMessage && (
        <span className="truncate text-xs text-slate-400 hidden sm:block">{agent.lastMessage}</span>
      )}
      <span className={`ml-auto shrink-0 text-[11px] font-semibold ${
        agent.status === "online" ? "text-emerald-600" : "text-slate-400"
      }`}>
        {agent.status}
      </span>
    </div>
  );
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

  if (loading) return <span className="text-sm text-slate-400">Loading agents…</span>;
  if (error) return <span className="text-sm text-rose-500">{error}</span>;
  if (!activity || activity.agents.length === 0) {
    return <span className="text-sm text-slate-400">No agents registered</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded((o) => !o)}
        onKeyDown={(e) => { if (e.key === "Escape" && expanded) { e.preventDefault(); setExpanded(false); } }}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-slate-100"
        aria-expanded={expanded}
        aria-label={`${activity.totalAgents} agents — click to expand`}
      >
        <span className="font-medium text-slate-600">
          {activity.totalAgents} {activity.totalAgents === 1 ? "Agent" : "Agents"}
        </span>
        {activity.onlineAgents > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {activity.onlineAgents} online
          </span>
        )}
        {activity.offlineAgents > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {activity.offlineAgents} offline
          </span>
        )}
        <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[280px] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="divide-y divide-slate-100 px-3">
            {activity.agents.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
