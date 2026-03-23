export interface Agent {
  id: string;
  name: string;
  status: "online" | "offline" | "idle";
  lastMessage: string | null;
  lastMessageAt: string | null;
  connectedAt: string;
  uptime: number; // milliseconds
  platform: string;
  version?: string;
}

export interface AgentActivity {
  agents: Agent[];
  totalAgents: number;
  onlineAgents: number;
  offlineAgents: number;
  lastUpdate: string;
}
