import type { Agent } from "@/lib/agents/types";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800 border-green-300";
      case "offline":
        return "bg-red-100 text-red-800 border-red-300";
      case "idle":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
  };

  const formatUptime = (ms: number) => {
    if (ms === 0) return "—";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{agent.name}</h3>
          <p className="text-sm text-gray-500">{agent.platform} {agent.version}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(
            agent.status
          )}`}
        >
          {agent.status}
        </span>
      </div>

      {agent.lastMessage && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 italic line-clamp-2">
            &ldquo;{agent.lastMessage}&rdquo;
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatTimestamp(agent.lastMessageAt)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Uptime:</span>
          <span className="ml-2 font-medium text-gray-900">
            {formatUptime(agent.uptime)}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Connected:</span>
          <span className="ml-2 font-medium text-gray-900">
            {formatTimestamp(agent.connectedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
