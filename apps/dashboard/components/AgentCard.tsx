import type { Agent } from "@/lib/agents/types";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "online":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "offline":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "idle":
        return "bg-amber-50 text-amber-700 border-amber-200";
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
    <article className="data-card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="pill-label">Agent</span>
            <p className="text-sm text-slate-500">{agent.platform} {agent.version}</p>
          </div>
          <h3 className="truncate text-xl font-semibold tracking-tight text-slate-950">{agent.name}</h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${getStatusColor(
            agent.status
          )}`}
        >
          {agent.status}
        </span>
      </div>

      {agent.lastMessage && (
        <div className="mb-5 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
          <p className="line-clamp-2 text-sm italic leading-6 text-slate-600">
            &ldquo;{agent.lastMessage}&rdquo;
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
            {formatTimestamp(agent.lastMessageAt)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Uptime</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{formatUptime(agent.uptime)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Connected</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{formatTimestamp(agent.connectedAt)}</div>
        </div>
      </div>
    </article>
  );
}
