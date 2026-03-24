"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "./AgentCard";
import { useGatewaySSE } from "@/lib/agents/gateway-sse";
import type { AgentActivity } from "@/lib/agents/types";

const GATEWAY_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_GATEWAY_URL ?? "")
    : "";

const GATEWAY_AVAILABLE = GATEWAY_URL !== "";

export function AgentList() {
  const { activity: sseActivity, connected, error: sseError } = useGatewaySSE();
  const [fallback, setFallback] = useState<AgentActivity | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // Load fallback (Triologue/mock) when gateway not configured or SSE fails
  useEffect(() => {
    if (!GATEWAY_AVAILABLE || sseError) {
      setFallbackLoading(true);
      fetch("/api/agents")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          setFallback(data);
          setFallbackLoading(false);
        })
        .catch(() => setFallbackLoading(false));

      // Poll every 30s as fallback
      const interval = setInterval(() => {
        fetch("/api/agents")
          .then((r) => r.ok ? r.json() : null)
          .then((data) => data && setFallback(data))
          .catch(() => {});
      }, 30_000);
      return () => clearInterval(interval);
    }
  }, [sseError]);

  const activity = (GATEWAY_AVAILABLE ? sseActivity : null) ?? fallback;
  const loading = !activity && (fallbackLoading || (GATEWAY_AVAILABLE && !connected && !sseError));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">
          {GATEWAY_AVAILABLE ? "Connecting to agent-ops gateway..." : "Loading agents..."}
        </div>
      </div>
    );
  }

  if (!activity || activity.agents.length === 0) {
    return (
      <div className="space-y-4">
        {sseError && GATEWAY_AVAILABLE && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            ⚠️ {sseError}
          </div>
        )}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
          No agents registered yet.{" "}
          {GATEWAY_AVAILABLE && (
            <>
              Run <code className="font-mono text-sm">agent-ops register --name &lt;name&gt;</code> to add one.
            </>
          )}
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
            connected && GATEWAY_AVAILABLE ? "bg-green-500" : "bg-yellow-500"
          }`}
        />
        <span className="text-gray-500">
          {connected && GATEWAY_AVAILABLE ? "Live (SSE)" : "Polling (Triologue)"}
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
