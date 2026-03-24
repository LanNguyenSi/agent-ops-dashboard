"use client";

import { useState } from "react";
import { AgentCard } from "./AgentCard";
import { useGatewaySSE } from "@/lib/agents/gateway-sse";
import type { AgentActivity } from "@/lib/agents/types";

// Fallback: fetch from existing API route (Triologue / mock)
async function fetchFallback(): Promise<AgentActivity | null> {
  try {
    const res = await fetch("/api/agents");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function AgentList() {
  const { activity: sseActivity, connected, error: sseError } = useGatewaySSE();
  const [fallback, setFallback] = useState<AgentActivity | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // If SSE has no data yet and not connected, load fallback once
  if (!sseActivity && !connected && !fallbackLoading && !fallback) {
    setFallbackLoading(true);
    fetchFallback().then((data) => {
      setFallback(data);
      setFallbackLoading(false);
    });
  }

  const activity = sseActivity ?? fallback;
  const loading = !activity && (fallbackLoading || (!connected && !sseError));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Connecting to agent-ops gateway...</div>
      </div>
    );
  }

  if (!activity || activity.agents.length === 0) {
    return (
      <div className="space-y-4">
        {sseError && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            ⚠️ {sseError}
          </div>
        )}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
          No agents registered yet. Run <code className="font-mono text-sm">agent-ops register --name &lt;name&gt;</code> to add one.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Connection status */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected ? "bg-green-500" : "bg-yellow-500"
          }`}
        />
        <span className="text-gray-500">
          {connected ? "Live (SSE)" : "Polling fallback"}
        </span>
      </div>

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
