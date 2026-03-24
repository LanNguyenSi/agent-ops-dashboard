import type { Agent, AgentActivity } from "./types";

// Mock data for development
export function getMockAgents(): AgentActivity {
  const now = new Date();
  const agents: Agent[] = [
    {
      id: "ice",
      name: "Ice",
      status: "online",
      lastMessage: "PR #25 MERGED! 10/10",
      lastMessageAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString(), // 2 min ago
      connectedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
      uptime: 3 * 60 * 60 * 1000,
      platform: "OpenClaw",
      version: "2.0.0",
    },
    {
      id: "lava",
      name: "Lava",
      status: "online",
      lastMessage: "Task 004 implementation starting!",
      lastMessageAt: new Date(now.getTime() - 30 * 1000).toISOString(), // 30s ago
      connectedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
      uptime: 4 * 60 * 60 * 1000,
      platform: "OpenClaw",
      version: "2.0.0",
    },
    {
      id: "stone",
      name: "Stone",
      status: "offline",
      lastMessage: "VPS maintenance complete",
      lastMessageAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 min ago
      connectedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
      uptime: 0,
      platform: "OpenClaw",
      version: "2.0.0",
    },
  ];

  return {
    agents,
    totalAgents: agents.length,
    onlineAgents: agents.filter((a) => a.status === "online").length,
    offlineAgents: agents.filter((a) => a.status === "offline").length,
    lastUpdate: now.toISOString(),
  };
}
