"use client";

import { useEffect, useState } from "react";
import { RepoCard } from "./RepoCard";
import type { RepoHealth } from "@/lib/github/types";

export function RepoList() {
  const [repos, setRepos] = useState<RepoHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchRepos() {
      try {
        const response = await fetch("/api/github/repos?limit=all&sort=updated&order=desc");
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch repos");
        }
        
        setRepos(data.repos || []);
        
        if (data.errors && data.errors.length > 0) {
          console.warn("Some repos failed to load:", data.errors);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRepos();
  }, []);
  
  if (loading) {
    return (
      <div className="loading-state">
        <div>Loading repositories...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-state">
        Error: {error}
      </div>
    );
  }
  
  if (repos.length === 0) {
    return (
      <div className="empty-state">
        No repositories found for the configured owner.
      </div>
    );
  }

  const totalOpenPrs = repos.reduce((sum, repo) => sum + repo.open_pr_count, 0);
  const failingRepos = repos.filter(
    (repo) => repo.failing_checks_count > 0 || repo.ci_status === "failure"
  ).length;
  const healthyRepos = repos.filter((repo) => repo.ci_status === "success").length;
  const activeRepos = repos.filter(
    (repo) => repo.open_pr_count > 0 || repo.last_workflow_run
  ).length;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="summary-card">
          <div className="summary-label">Repositories</div>
          <div className="summary-value">{repos.length}</div>
          <div className="summary-note">Currently tracked in this dashboard.</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Healthy CI</div>
          <div className="summary-value text-emerald-600">{healthyRepos}</div>
          <div className="summary-note">Repositories with passing checks.</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Failing Repos</div>
          <div className="summary-value text-rose-600">{failingRepos}</div>
          <div className="summary-note">Needing attention due to CI or checks.</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Open PRs</div>
          <div className="summary-value">{totalOpenPrs}</div>
          <div className="summary-note">{activeRepos} repositories with recent delivery signals.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {repos.map((repo) => (
          <RepoCard key={`${repo.owner}/${repo.repo}`} repo={repo} />
        ))}
      </div>
    </div>
  );
}
