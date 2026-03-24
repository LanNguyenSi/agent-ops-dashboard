"use client";

import type { RepoHealth } from "@/lib/github/types";

const CI_BADGE: Record<string, { label: string; className: string }> = {
  success: { label: "Passing", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failure: { label: "Failing", className: "bg-rose-50 text-rose-700 border-rose-200" },
  pending: { label: "Running", className: "bg-sky-50 text-sky-700 border-sky-200" },
  unknown: { label: "Unknown", className: "bg-slate-100 text-slate-700 border-slate-200" },
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
  TypeScript: "bg-sky-50 text-sky-700",
  JavaScript: "bg-amber-50 text-amber-700",
  Python: "bg-emerald-50 text-emerald-700",
  Go: "bg-cyan-50 text-cyan-700",
  Rust: "bg-orange-50 text-orange-700",
  Shell: "bg-slate-100 text-slate-700",
};

export function RepoCard({ repo }: { repo: RepoHealth }) {
  const langColor = repo.language ? (LANG_COLORS[repo.language] ?? "bg-indigo-50 text-indigo-700") : null;

  return (
    <article className="data-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2">
            <span className="pill-label">{repo.owner}</span>
          </div>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-lg font-semibold tracking-tight text-slate-950 transition-colors hover:text-sky-700"
          >
            {repo.repo}
          </a>
          {repo.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{repo.description}</p>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${(CI_BADGE[repo.ci_status] ?? CI_BADGE.unknown).className}`}>
          {(CI_BADGE[repo.ci_status] ?? CI_BADGE.unknown).label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {repo.language && langColor && (
          <span className={`rounded-full px-2.5 py-1 font-medium ${langColor}`}>
            {repo.language}
          </span>
        )}
        {typeof repo.stars === "number" && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            Stars {repo.stars}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          {repo.default_branch}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Open PRs</div>
          {repo.open_pr_count > 0 ? (
            <a
              href={`${repo.html_url}/pulls`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-lg font-semibold text-sky-700 hover:underline"
            >
              {repo.open_pr_count}
            </a>
          ) : (
            <div className="mt-2 text-lg font-semibold text-slate-900">0</div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Failing Checks</div>
          <div className={`mt-2 text-lg font-semibold ${repo.failing_checks_count > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {repo.failing_checks_count}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs text-slate-400">
        <span>
          {repo.last_workflow_run ? (
            <a
              href={repo.last_workflow_run.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-slate-600"
            >
              CI: {timeAgo(repo.last_workflow_run.updated_at)}
            </a>
          ) : (
            "No CI runs"
          )}
        </span>
        <span>pushed {timeAgo(repo.pushed_at ?? repo.updated_at)}</span>
      </div>
    </article>
  );
}
