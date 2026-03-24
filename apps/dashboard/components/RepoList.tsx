"use client";

import { useEffect, useState } from "react";
import { RepoCard } from "./RepoCard";
import { Select } from "./Select";
import type { RepoHealth, RepoHealthResponse } from "@/lib/github/types";

type SortOption = "updated" | "stars" | "name" | "ci_status";
type FilterOption = "all" | "failing" | "open_prs" | "vulnerable";

const SORT_LABELS: Record<SortOption, string> = {
  updated: "Last updated",
  stars: "Stars",
  name: "Name",
  ci_status: "CI status",
};

const FILTER_LABELS: Record<FilterOption, string> = {
  all: "All",
  failing: "Failing CI",
  open_prs: "Open PRs",
  vulnerable: "Vulnerable",
};

const sortOptions = (Object.keys(SORT_LABELS) as SortOption[]).map((s) => ({
  value: s,
  label: SORT_LABELS[s],
}));

const limitOptions = [
  { value: "10", label: "10 repos" },
  { value: "25", label: "25 repos" },
  { value: "50", label: "50 repos" },
  { value: "all", label: "All repos" },
];

export function RepoList() {
  const [repos, setRepos] = useState<RepoHealth[]>([]);
  const [meta, setMeta] = useState<RepoHealthResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheState, setCacheState] = useState<string | null>(null);

  // Filter/sort state
  const [sort, setSort] = useState<SortOption>("updated");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [limit, setLimit] = useState<number | "all">(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchRepos() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          sort,
          order: "desc",
          filter,
          limit: String(limit),
          page: String(page),
        });
        const response = await fetch(`/api/github/repos?${params}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Failed to fetch repos");

        setRepos(data.repos || []);
        setMeta(data.meta ?? null);
        setCacheState(data.meta?.cache ?? null);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRepos();
  }, [sort, filter, limit, page]);

  const totalOpenPrs = repos.reduce((sum, r) => sum + r.open_pr_count, 0);
  const failingRepos = repos.filter((r) => r.failing_checks_count > 0 || r.ci_status === "failure").length;
  const healthyRepos = repos.filter((r) => r.ci_status === "success").length;
  const paginationDisabled = loading || limit === "all" || !meta;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter */}
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm" role="group" aria-label="Filter repositories">
          {(Object.keys(FILTER_LABELS) as FilterOption[]).map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-inset outline-none ${
                filter === f
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <Select
          value={sort}
          onChange={(v) => { setSort(v as SortOption); setPage(1); }}
          options={sortOptions}
          className="w-40"
        />

        {/* Limit */}
        <Select
          value={String(limit)}
          onChange={(v) => { setLimit(v === "all" ? "all" : Number(v)); setPage(1); }}
          options={limitOptions}
          className="w-32"
        />

        {/* Cache indicator */}
        <span className="ml-auto text-xs text-slate-400">
          {cacheState === "hit" ? "⚡ cached" : cacheState === "stale" ? "⟳ refreshing" : ""}
        </span>
      </div>

      {/* Summary cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="summary-card">
            <div className="summary-label">Showing</div>
            <div className="summary-value">
              {meta?.rangeStart ?? 0}-{meta?.rangeEnd ?? 0}
              <span className="text-lg text-slate-400">/{meta?.filtered ?? repos.length}</span>
            </div>
            <div className="summary-note">matching repos</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Healthy CI</div>
            <div className="summary-value text-emerald-600">{healthyRepos}</div>
            <div className="summary-note">passing checks</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Failing</div>
            <div className="summary-value text-rose-600">{failingRepos}</div>
            <div className="summary-note">needs attention</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Open PRs</div>
            <div className="summary-value">{totalOpenPrs}</div>
            <div className="summary-note">across repos</div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center p-12 text-slate-500">
          Loading repositories...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          Error: {error}
        </div>
      )}
      {!loading && !error && repos.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          No repositories match the current filter.
        </div>
      )}
      {!loading && !error && repos.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {repos.map((repo) => (
              <RepoCard key={`${repo.owner}/${repo.repo}`} repo={repo} />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600">
            <div>
              {limit === "all"
                ? `Showing all ${meta?.filtered ?? repos.length} repositories`
                : `Page ${meta?.page ?? 1} of ${meta?.totalPages ?? 1}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={paginationDisabled || !meta?.hasPreviousPage}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Previous
              </button>
              <div className="min-w-24 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                {limit === "all"
                  ? `${meta?.filtered ?? repos.length} total`
                  : `${meta?.rangeStart ?? 0}-${meta?.rangeEnd ?? 0} shown`}
              </div>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={paginationDisabled || !meta?.hasNextPage}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
