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
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Error: {error}
      </div>
    );
  }

  if (!activity || activity.agents.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
        No agents registered yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className={`inline-block w-2 h-2 rounded-full ${source === "gateway" ? "bg-green-500" : "bg-yellow-500"}`} />
        <span className="text-gray-500">
          {source === "gateway" ? "agent-ops-gateway" : "Triologue fallback"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{activity.totalAgents}</div>
          <div className="text-sm text-gray-600">Total Agents</div>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{activity.onlineAgents}</div>
          <div className="text-sm text-gray-600">Online</div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{activity.offlineAgents}</div>
          <div className="text-sm text-gray-600">Offline</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activity.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        Last updated: {new Date(activity.lastUpdate).toLocaleTimeString()}
      </div>
    </div>
  );
}
