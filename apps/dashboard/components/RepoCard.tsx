"use client";

import type { RepoHealth } from "@/lib/github/types";

const CI_BADGE: Record<string, { label: string; className: string }> = {
  success: { label: "✓ Passing", className: "bg-green-100 text-green-800 border-green-300" },
  failure: { label: "✗ Failing", className: "bg-red-100 text-red-800 border-red-300" },
  pending: { label: "⟳ Running", className: "bg-blue-100 text-blue-800 border-blue-300" },
  unknown: { label: "— Unknown", className: "bg-gray-100 text-gray-700 border-gray-300" },
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-100 text-blue-800",
  JavaScript: "bg-yellow-100 text-yellow-800",
  Python: "bg-green-100 text-green-800",
  Go: "bg-cyan-100 text-cyan-800",
  Rust: "bg-orange-100 text-orange-800",
  Shell: "bg-gray-100 text-gray-800",
};

export function RepoCard({ repo }: { repo: RepoHealth }) {
  const langColor = repo.language ? (LANG_COLORS[repo.language] ?? "bg-purple-100 text-purple-800") : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate block"
          >
            {repo.repo}
          </a>
          {repo.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{repo.description}</p>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${(CI_BADGE[repo.ci_status] ?? CI_BADGE.unknown).className}`}>
          {(CI_BADGE[repo.ci_status] ?? CI_BADGE.unknown).label}
        </span>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {repo.language && langColor && (
          <span className={`rounded-full px-2 py-0.5 font-medium ${langColor}`}>
            {repo.language}
          </span>
        )}
        {typeof repo.stars === "number" && (
          <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
            ⭐ {repo.stars}
          </span>
        )}
        <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">
          {repo.default_branch}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">PRs open:</span>
          {repo.open_pr_count > 0 ? (
            <a
              href={`${repo.html_url}/pulls`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 hover:underline"
            >
              {repo.open_pr_count}
            </a>
          ) : (
            <span className="font-semibold text-gray-900">0</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Failing:</span>
          <span className={`font-semibold ${repo.failing_checks_count > 0 ? "text-red-600" : "text-gray-900"}`}>
            {repo.failing_checks_count}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-2 mt-auto">
        <span>
          {repo.last_workflow_run ? (
            <a
              href={repo.last_workflow_run.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600"
            >
              CI: {timeAgo(repo.last_workflow_run.updated_at)}
            </a>
          ) : (
            "No CI runs"
          )}
        </span>
        <span>pushed {timeAgo(repo.pushed_at ?? repo.updated_at)}</span>
      </div>
    </div>
  );
}
