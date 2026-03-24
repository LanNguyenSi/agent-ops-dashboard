import type { AgentActivity, Agent } from "./types";
import { getMockAgents } from "./mock-data";

const TRIOLOGUE_HEALTH_URL = "https://opentriologue.ai/gateway/health";

/**
 * Fetch real agent activity from Triologue API
 * Falls back to mock data if API is unavailable
 */
export async function getAgentActivity(): Promise<AgentActivity> {
  try {
    const response = await fetch(TRIOLOGUE_HEALTH_URL, {
      next: { revalidate: 15 }, // Cache for 15 seconds
    });
    
    if (!response.ok) {
      throw new Error(`Triologue API responded with ${response.status}`);
    }
    
    const data = await response.json();
    return parseTriologueResponse(data);
  } catch (error) {
    console.error("Failed to fetch agent activity from Triologue, using mock data:", error);
    return getMockAgents();
  }
}

interface TriologueHealthResponse {
  status: string;
  connectedAgents: number;
  agents: Array<{
    id: string;
    name: string;
    status?: string;
    connectedAt?: string;
    lastActivity?: string;
    platform?: string;
    version?: string;
  }>;
  uptime?: number;
}

/**
 * Transform Triologue API response to AgentActivity format
 */
function parseTriologueResponse(data: TriologueHealthResponse): AgentActivity {
  const now = new Date().toISOString();
  
  const agents: Agent[] = data.agents.map(agent => {
    const connectedAt = agent.connectedAt || now;
    const uptime = agent.connectedAt 
      ? Date.now() - new Date(agent.connectedAt).getTime()
      : 0;
    
    return {
      id: agent.id,
      name: agent.name,
      status: agent.status === "online" ? "online" : "idle",
      lastMessage: null, // Triologue API doesn't provide this yet
      lastMessageAt: agent.lastActivity || null,
      connectedAt,
      uptime,
      platform: agent.platform || "triologue",
      version: agent.version,
    };
  });
  
  const onlineAgents = agents.filter(a => a.status === "online").length;
  const offlineAgents = agents.filter(a => a.status === "offline").length;
  
  return {
    agents,
    totalAgents: data.connectedAgents,
    onlineAgents,
    offlineAgents,
    lastUpdate: now,
  };
}
