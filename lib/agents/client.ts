import type { AgentActivity } from "./types";
import { getMockAgents } from "./mock-data";

// TODO: Replace with real Triologue API when available
export async function getAgentActivity(): Promise<AgentActivity> {
  // For MVP, return mock data
  // In production, fetch from http://localhost:9500/health
  
  /*
  try {
    const response = await fetch("http://localhost:9500/health");
    if (!response.ok) {
      throw new Error("Failed to fetch agent activity");
    }
    const data = await response.json();
    return parseTriologueResponse(data);
  } catch (error) {
    console.error("Failed to fetch agent activity, using mock data:", error);
    return getMockAgents();
  }
  */
  
  return getMockAgents();
}

// TODO: Parse real Triologue API response
function parseTriologueResponse(data: any): AgentActivity {
  // Transform Triologue /health connectedAgents format
  // to our AgentActivity format
  return getMockAgents(); // Placeholder
}
