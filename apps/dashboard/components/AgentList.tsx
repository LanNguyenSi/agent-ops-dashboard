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

export function AgentList() {
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"gateway" | "triologue">("gateway");

  useEffect(() => {
    async function fetchAgents() {
      // Try gateway proxy first
      try {
        const res = await fetch("/api/gateway/agents");
        if (res.ok) {
          const agents: GatewayAgent[] = await res.json();
          setActivity(toAgentActivity(agents));
          setSource("gateway");
          setError(null);
          setLoading(false);
          return;
        }
      } catch {}

      // Fallback: Triologue /api/agents
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          setActivity(data);
          setSource("triologue");
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
    return (
      <div className="loading-state">
        <div>Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        Error: {error}
      </div>
    );
  }

  if (!activity || activity.agents.length === 0) {
    return (
      <div className="empty-state">
        No agents registered yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-label">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              source === "gateway" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span>
            Data source:
          </span>
          <span className="pill-label">
            {source === "gateway" ? "agent-ops-gateway" : "Triologue fallback"}
          </span>
        </div>
        <div className="text-sm text-slate-500">
          Last updated {new Date(activity.lastUpdate).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="summary-card">
          <div className="summary-label">Total Agents</div>
          <div className="summary-value">{activity.totalAgents}</div>
          <div className="summary-note">Registered across the connected control plane.</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Online</div>
          <div className="summary-value text-emerald-600">{activity.onlineAgents}</div>
          <div className="summary-note">Currently reachable and reporting back.</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Offline</div>
          <div className="summary-value text-rose-600">{activity.offlineAgents}</div>
          <div className="summary-note">Agents without an active presence right now.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {activity.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
