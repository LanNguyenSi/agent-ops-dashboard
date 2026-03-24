import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/github/client";
import { getRepoHealth } from "@/lib/github/repos";

export async function GET() {
  try {
    const octokit = getOctokit();

    // Fetch 10 most recently updated repos for LanNguyenSi
    const { data: userRepos } = await octokit.repos.listForUser({
      username: "LanNguyenSi",
      sort: "updated",
      direction: "desc",
      per_page: 10,
      type: "owner",
    });

    const healthResults = await Promise.allSettled(
      userRepos.map((r) => getRepoHealth(r.owner.login, r.name))
    );

    const repos = healthResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    const errors = healthResults
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason.message);

    return NextResponse.json({
      repos,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch repos" },
      { status: 500 }
    );
  }
}
