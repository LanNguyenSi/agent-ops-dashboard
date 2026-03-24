import { NextResponse } from "next/server";
import { getFailingChecks } from "@/lib/github/checks";

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
    const checkResults = await Promise.allSettled(
      repos.map(async (repoString) => {
        const [owner, repo] = repoString.split("/");
        const checks = await getFailingChecks(owner, repo);
        return checks.map((check) => ({ ...check, owner, repo }));
      })
    );
    
    const allChecks = checkResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => (result as PromiseFulfilledResult<any>).value);
    
    return NextResponse.json({ checks: allChecks });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch checks" },
      { status: 500 }
    );
  }
}
