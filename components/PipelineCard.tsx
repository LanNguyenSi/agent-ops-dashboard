import { StatusBadge } from "./StatusBadge";
import type { PipelineRun } from "@/lib/pipeline/types";

interface PipelineCardProps {
  run: PipelineRun;
}

export function PipelineCard({ run }: PipelineCardProps) {
  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{run.name}</h3>
          <p className="text-sm text-gray-600">
            {run.repository} • {run.branch}
          </p>
        </div>
        <StatusBadge status={run.status} size="sm" />
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Commit:</span>
          <a
            href={run.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 font-mono text-blue-600 hover:underline"
          >
            {run.commit}
          </a>
        </div>
        
        <p className="text-gray-700 italic line-clamp-1">{run.commitMessage}</p>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>By {run.author}</span>
          <span>{formatDuration(run.duration)}</span>
        </div>
        
        <div className="text-xs text-gray-400">
          {formatDate(run.startedAt)}
        </div>
      </div>
    </div>
  );
}
