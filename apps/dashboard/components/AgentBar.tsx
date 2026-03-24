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

const STATUS_COLOR: Record<string, string> = {
  online: "bg-emerald-100 text-emerald-700 border-emerald-200",
  offline: "bg-slate-100 text-slate-500 border-slate-200",
  idle: "bg-amber-50 text-amber-600 border-amber-200",
};

function CompactAgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="data-card flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-slate-900">{agent.name}</span>
        <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLOR[agent.status] ?? STATUS_COLOR.offline}`}>
          {agent.status}
        </span>
      </div>
      {agent.lastMessage && (
        <p className="line-clamp-1 text-xs text-slate-400 italic">{agent.lastMessage}</p>
      )}
      <div className="text-[11px] text-slate-400">{agent.platform}</div>
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
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[480px] max-w-[90vw] rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {activity.agents.map((agent) => (
              <CompactAgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
