"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "./AgentCard";
import type { AgentActivity } from "@/lib/agents/types";

export function AgentList() {
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/agents");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch agents");
        }

        setActivity(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAgents, 30000);
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
        No agents found.
      </div>
    );
  }

  return (
    <div>
      {/* Stats Summary */}
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

      {/* Agent Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activity.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Last Update */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Last updated: {new Date(activity.lastUpdate).toLocaleTimeString()}
      </div>
    </div>
  );
}
