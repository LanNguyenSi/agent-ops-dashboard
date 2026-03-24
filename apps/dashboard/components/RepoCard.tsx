import { CheckStatus } from "./CheckStatus";
import type { RepoHealth } from "@/lib/github/types";

interface RepoCardProps {
  repo: RepoHealth;
}

export function RepoCard({ repo }: RepoCardProps) {
  const lastRunTime = repo.last_workflow_run
    ? new Date(repo.last_workflow_run.updated_at).toLocaleString()
    : "Never";
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600"
            >
              {repo.owner}/{repo.repo}
            </a>
          </h3>
          <p className="text-sm text-gray-500">Branch: {repo.default_branch}</p>
        </div>
        <CheckStatus status={repo.ci_status} />
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Open PRs:</span>
          <span className="ml-2 font-medium text-gray-900">{repo.open_pr_count}</span>
        </div>
        <div>
          <span className="text-gray-600">Failing Checks:</span>
          <span className={`ml-2 font-medium ${repo.failing_checks_count > 0 ? "text-red-600" : "text-gray-900"}`}>
            {repo.failing_checks_count}
          </span>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        Last run: {lastRunTime}
      </div>
    </div>
  );
}
