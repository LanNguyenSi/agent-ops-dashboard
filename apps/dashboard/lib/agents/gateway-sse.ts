"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentActivity, Agent } from "./types";

// Gateway Agent shape (from @agent-ops/gateway)
interface GatewayAgent {
  id: string;
  name: string;
  status: "online" | "offline" | "idle" | "busy";
  lastSeen: string;
  currentTask?: string;
  tags: string[];
  registeredAt: string;
  meta?: Record<string, unknown>;
}

interface SSEEvent {
  type: "agent:registered" | "agent:updated" | "agent:offline" | "snapshot" | "agent:command";
  data: GatewayAgent | GatewayAgent[];
  timestamp: string;
}

function toAgent(g: GatewayAgent): Agent {
  return {
    id: g.id,
    name: g.name,
    status: g.status === "busy" ? "online" : g.status,
    lastMessage: g.currentTask || null,
    lastMessageAt: g.lastSeen,
    connectedAt: g.registeredAt,
    uptime: Date.now() - new Date(g.registeredAt).getTime(),
    platform: g.tags.join(", ") || "agent-ops",
  };
}

function toActivity(agents: Agent[]): AgentActivity {
  return {
    agents,
    totalAgents: agents.length,
    onlineAgents: agents.filter((a) => a.status === "online").length,
    offlineAgents: agents.filter((a) => a.status === "offline").length,
    lastUpdate: new Date().toISOString(),
  };
}

export function useGatewaySSE(): {
  activity: AgentActivity | null;
  connected: boolean;
  error: string | null;
} {
  const [agentMap, setAgentMap] = useState<Map<string, Agent>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const gatewayUrl =
      process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:3001";
    const url = `${gatewayUrl}/events`;

    const connect = () => {
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(null);
      };

      es.onmessage = (e) => {
        try {
          const event: SSEEvent = JSON.parse(e.data);

          if (event.type === "snapshot") {
            const agents = (event.data as GatewayAgent[]).map(toAgent);
            setAgentMap(new Map(agents.map((a) => [a.id, a])));
          } else if (
            event.type === "agent:registered" ||
            event.type === "agent:updated" ||
            event.type === "agent:offline"
          ) {
            const agent = toAgent(event.data as GatewayAgent);
            setAgentMap((prev) => new Map(prev).set(agent.id, agent));
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setConnected(false);
        setError("Gateway disconnected — retrying...");
        es.close();
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
    };
  }, []);

  const activity =
    agentMap.size > 0 || connected
      ? toActivity(Array.from(agentMap.values()))
      : null;

  return { activity, connected, error };
}
