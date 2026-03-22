import { getOctokit } from "./client";
import type { PullRequest } from "./types";

export async function getOpenPRs(owner: string, repo: string): Promise<PullRequest[]> {
  const octokit = getOctokit();
  
  // TODO: Add pagination support for repos with >100 open PRs
  const { data: prs } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    per_page: 100,
  });
  
  return prs.map((pr) => ({
    number: pr.number,
    title: pr.title,
    html_url: pr.html_url,
    state: pr.state as "open" | "closed",
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    user: {
      login: pr.user?.login || "unknown",
      avatar_url: pr.user?.avatar_url || "",
    },
    head: {
      ref: pr.head.ref,
      sha: pr.head.sha,
    },
    base: {
      ref: pr.base.ref,
    },
    draft: pr.draft || false,
    mergeable_state: pr.mergeable_state || undefined,
  }));
}
