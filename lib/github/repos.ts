import { getOctokit } from "./client";
import type { RepoHealth, WorkflowRun } from "./types";

export async function getRepoHealth(owner: string, repo: string): Promise<RepoHealth> {
  const octokit = getOctokit();
  
  try {
    // Get repository info
    const { data: repository } = await octokit.repos.get({ owner, repo });
    
    // Get open PRs count
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 1,
    });
    
    // Get latest workflow runs
    const { data: workflowRuns } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 1,
      status: "completed",
    });
    
    const lastRun = workflowRuns.workflow_runs[0] || null;
    
    // Get failing checks for latest commit
    const { data: checkRuns } = await octokit.checks.listForRef({
      owner,
      repo,
      ref: repository.default_branch,
      per_page: 100,
    });
    
    const failingChecks = checkRuns.check_runs.filter(
      (check) => check.conclusion === "failure"
    );
    
    // Determine CI status
    let ci_status: RepoHealth["ci_status"] = "unknown";
    if (lastRun) {
      if (lastRun.conclusion === "success") {
        ci_status = "success";
      } else if (lastRun.conclusion === "failure") {
        ci_status = "failure";
      } else if (lastRun.status === "in_progress" || lastRun.status === "queued") {
        ci_status = "pending";
      }
    }
    
    return {
      owner,
      repo,
      default_branch: repository.default_branch,
      html_url: repository.html_url,
      ci_status,
      open_pr_count: prs.length,
      failing_checks_count: failingChecks.length,
      last_workflow_run: lastRun as WorkflowRun | null,
      updated_at: repository.updated_at,
    };
  } catch (error: any) {
    // Handle rate limiting
    if (error.status === 429) {
      const resetTime = error.response?.headers["x-ratelimit-reset"];
      throw new Error(`Rate limited. Reset at ${new Date(resetTime * 1000)}`);
    }
    throw error;
  }
}
