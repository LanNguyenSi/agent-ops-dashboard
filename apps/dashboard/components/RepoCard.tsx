"use client";

import { useRef, useState } from "react";
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

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-rose-700",
  high: "text-orange-600",
  medium: "text-amber-600",
  low: "text-slate-500",
};

function VulnerabilityBadge({ repo }: { repo: RepoHealth }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const vulns = repo.vulnerabilities;
  if (!vulns || vulns.total === 0) return null;

  const items = [
    vulns.critical > 0 ? { label: "critical", value: vulns.critical } : null,
    vulns.high > 0 ? { label: "high", value: vulns.high } : null,
    vulns.medium > 0 ? { label: "medium", value: vulns.medium } : null,
    vulns.low > 0 ? { label: "low", value: vulns.low } : null,
  ].filter((x): x is { label: string; value: number } => x !== null);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-800 transition-colors hover:border-rose-300 hover:bg-rose-100"
        aria-label={`${vulns.total} vulnerabilities — click for details`}
      >
        <span>🔴</span>
        <span>{vulns.total} CVEs</span>
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5L10 12.5L15 7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="px-3 py-2 text-xs">
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-0.5">
                <span className={`font-medium ${SEVERITY_COLOR[item.label] ?? "text-slate-600"}`}>
                  {item.label}
                </span>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-3 py-2">
            <a
              href={`${repo.html_url}/security/dependabot`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
            >
              View on GitHub
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function RepoCard({ repo }: { repo: RepoHealth }) {
  const langColor = repo.language ? (LANG_COLORS[repo.language] ?? "bg-indigo-50 text-indigo-700") : null;

  return (
    <article className="data-card flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5">
            <span className="pill-label">{repo.owner}</span>
          </div>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-base font-semibold tracking-tight text-slate-950 transition-colors hover:text-sky-700"
          >
            {repo.repo}
          </a>
          {repo.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{repo.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${(CI_BADGE[repo.ci_status] ?? CI_BADGE.unknown).className}`}>
            {(CI_BADGE[repo.ci_status] ?? CI_BADGE.unknown).label}
          </span>
          <VulnerabilityBadge repo={repo} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {repo.language && langColor && (
          <span className={`rounded-full px-2.5 py-1 font-medium ${langColor}`}>
            {repo.language}
          </span>
        )}
        {typeof repo.stars === "number" && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            {repo.stars} stars
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          {repo.default_branch}
        </span>
        {repo.open_pr_count > 0 && (
          <a
            href={`${repo.html_url}/pulls`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700 transition-colors hover:bg-sky-100"
          >
            {repo.open_pr_count} {repo.open_pr_count === 1 ? "PR" : "PRs"}
          </a>
        )}
        {repo.failing_checks_count > 0 && (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-600">
            {repo.failing_checks_count} failing
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-xs text-slate-400">
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
