import type { AgentActivity, Agent } from "./types";

/** Env var holding the Triologue health endpoint, e.g. https://triologue.example/gateway/health. */
export const TRIOLOGUE_HEALTH_URL_ENV = "TRIOLOGUE_HEALTH_URL";

/** The Triologue health URL is not configured, so there is no agent source to read. */
export class AgentSourceNotConfiguredError extends Error {
  readonly code = "NOT_CONFIGURED";
  constructor() {
    super(`Agent source not configured: set ${TRIOLOGUE_HEALTH_URL_ENV} to a Triologue health endpoint`);
    this.name = "AgentSourceNotConfiguredError";
  }
}

/** The configured Triologue endpoint did not answer with usable agent data. */
export class AgentSourceError extends Error {
  readonly code = "UPSTREAM_FAILED";
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AgentSourceError";
  }
}

export function getAgentSourceUrl(): string | null {
  const url = process.env[TRIOLOGUE_HEALTH_URL_ENV]?.trim();
  return url ? url : null;
}

/**
 * Fetch agent activity from the configured Triologue health endpoint.
 * Throws AgentSourceNotConfiguredError when no URL is configured and
 * AgentSourceError when the endpoint fails; it never invents agents.
 */
export async function getAgentActivity(): Promise<AgentActivity> {
  const url = getAgentSourceUrl();
  if (!url) throw new AgentSourceNotConfiguredError();

  try {
    const response = await fetch(url, {
      next: { revalidate: 15 }, // Cache for 15 seconds
    });

    if (!response.ok) {
      throw new Error(`Triologue API responded with ${response.status}`);
    }

    const data = await response.json();
    return parseTriologueResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Triologue API unreachable";
    throw new AgentSourceError(message, { cause: error });
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
