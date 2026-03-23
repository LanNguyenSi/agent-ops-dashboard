import { getOctokit } from "@/lib/github/client";
import type { PipelineRun, PipelineFilters } from "./types";

export async function getPipelineRuns(filters: PipelineFilters = {}): Promise<PipelineRun[]> {
  const octokit = getOctokit();
  const reposEnv = process.env.GITHUB_REPOS;
  
  if (!reposEnv) {
    throw new Error("GITHUB_REPOS environment variable not set");
  }
  
  const repos = reposEnv.split(",").map((r) => r.trim());
  const allRuns: PipelineRun[] = [];
  
  for (const repoString of repos) {
    const [owner, repo] = repoString.split("/");
    if (!owner || !repo) continue;
    
    // Skip if filtering by specific repo
    if (filters.repository && filters.repository !== repoString) {
      continue;
    }
    
    try {
      const { data } = await octokit.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: filters.limit || 50,
        status: filters.status === "in_progress" ? "in_progress" : "completed",
      });
      
      for (const run of data.workflow_runs) {
        // Filter by status
        if (filters.status && run.conclusion !== filters.status) {
          continue;
        }
        
        // Filter by branch
        if (filters.branch && run.head_branch !== filters.branch) {
          continue;
        }
        
        // Filter by date
        const runDate = new Date(run.created_at);
        if (filters.startDate && runDate < new Date(filters.startDate)) {
          continue;
        }
        if (filters.endDate && runDate > new Date(filters.endDate)) {
          continue;
        }
        
        const startedAt = new Date(run.run_started_at || run.created_at);
        const completedAt = run.updated_at ? new Date(run.updated_at) : null;
        const duration = completedAt ? completedAt.getTime() - startedAt.getTime() : null;
        
        allRuns.push({
          id: run.id,
          name: run.name || "Workflow",
          status: mapStatus(run.status || "completed", run.conclusion),
          conclusion: run.conclusion,
          repository: repoString,
          branch: run.head_branch || "unknown",
          commit: run.head_sha.substring(0, 7),
          commitMessage: run.display_title || "",
          author: run.actor?.login || "unknown",
          startedAt: startedAt.toISOString(),
          completedAt: completedAt?.toISOString() || null,
          duration,
          htmlUrl: run.html_url,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch runs for ${repoString}:`, error);
    }
  }
  
  // Sort by started date (newest first)
  allRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  
  return allRuns.slice(0, filters.limit || 50);
}

function mapStatus(status: string, conclusion: string | null | undefined): PipelineRun["status"] {
  if (status === "in_progress" || status === "queued") {
    return "in_progress";
  }
  
  if (conclusion === "success") return "success";
  if (conclusion === "failure") return "failure";
  if (conclusion === "cancelled") return "cancelled";
  if (conclusion === "skipped") return "skipped";
  
  return "failure"; // default for unknown
}
