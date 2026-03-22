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
        const response = await fetch("/api/github/repos");
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
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Loading repositories...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Error: {error}
      </div>
    );
  }
  
  if (repos.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
        No repositories configured. Set GITHUB_REPOS environment variable.
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo) => (
        <RepoCard key={`${repo.owner}/${repo.repo}`} repo={repo} />
      ))}
    </div>
  );
}
