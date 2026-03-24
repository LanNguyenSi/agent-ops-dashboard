"use client";

import { useEffect, useState } from "react";
import { PipelineCard } from "./PipelineCard";
import type { PipelineRun } from "@/lib/pipeline/types";

export function PipelineList() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRuns() {
      try {
        const response = await fetch("/api/pipeline/runs?limit=20");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch pipeline runs");
        }

        setRuns(data.runs || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRuns();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchRuns, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Loading pipeline runs...</div>
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

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
        No pipeline runs found. Set GITHUB_REPOS environment variable.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {runs.map((run) => (
        <PipelineCard key={run.id} run={run} />
      ))}
    </div>
  );
}
