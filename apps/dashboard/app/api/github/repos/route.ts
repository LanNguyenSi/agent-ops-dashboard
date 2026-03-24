import { NextResponse } from "next/server";
import { getRepoHealth } from "@/lib/github/repos";

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
    const healthResults = await Promise.allSettled(
      repos.map(async (repoString) => {
        const [owner, repo] = repoString.split("/");
        if (!owner || !repo) {
          throw new Error(`Invalid repo format: ${repoString}`);
        }
        return getRepoHealth(owner, repo);
      })
    );
    
    const successfulResults = healthResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<any>).value);
    
    const errors = healthResults
      .filter((result) => result.status === "rejected")
      .map((result) => (result as PromiseRejectedResult).reason.message);
    
    return NextResponse.json({
      repos: successfulResults,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch repos" },
      { status: 500 }
    );
  }
}
