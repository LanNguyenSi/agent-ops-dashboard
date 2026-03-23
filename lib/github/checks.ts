import { getOctokit } from "./client";
import type { CheckRun } from "./types";

export async function getFailingChecks(owner: string, repo: string): Promise<CheckRun[]> {
  const octokit = getOctokit();

  const { data: repository } = await octokit.repos.get({ owner, repo });
  const { data: checkRuns } = await octokit.checks.listForRef({
    owner,
    repo,
    ref: repository.default_branch,
    per_page: 100,
  });

  return checkRuns.check_runs
    .filter((check) => check.conclusion === "failure")
    .map((check) => ({
      id: check.id,
      name: check.name,
      status: check.status as CheckRun["status"],
      conclusion: check.conclusion as CheckRun["conclusion"],
      html_url: check.html_url ?? "",
      started_at: check.started_at ?? null,
      completed_at: check.completed_at ?? null,
    }));
}
