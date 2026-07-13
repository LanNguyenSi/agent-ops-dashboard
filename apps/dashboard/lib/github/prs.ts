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
    // The `pulls.list` response type doesn't declare `mergeable_state`
    // (only the single-PR `pulls.get` endpoint's type does), but GitHub's
    // API includes it on list items too, so we read it via a narrow cast
    // instead of typing it as `any`.
    mergeable_state: (pr as unknown as { mergeable_state?: string }).mergeable_state || undefined,
  }));
}
