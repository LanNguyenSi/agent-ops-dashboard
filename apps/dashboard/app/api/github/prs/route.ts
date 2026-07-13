import { NextResponse } from "next/server";
import { getOpenPRs } from "@/lib/github/prs";
import type { PullRequest } from "@/lib/github/types";

type PullRequestWithRepo = PullRequest & { owner: string; repo: string };

export async function GET() {
  try {
    const reposEnv = process.env.GITHUB_REPOS;
    
    if (!reposEnv) {
      return NextResponse.json(
        { error: "GITHUB_REPOS environment variable not set" },
        { status: 500 }
      );
    }
    
    const repos = reposEnv.split(",").map((r) => r.trim());
    const prResults = await Promise.allSettled(
      repos.map(async (repoString) => {
        const [owner, repo] = repoString.split("/");
        const prs = await getOpenPRs(owner, repo);
        return prs.map((pr) => ({ ...pr, owner, repo }));
      })
    );
    
    const allPRs = prResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => (result as PromiseFulfilledResult<PullRequestWithRepo[]>).value);

    return NextResponse.json({ prs: allPRs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch PRs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
