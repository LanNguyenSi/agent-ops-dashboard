import { NextResponse } from "next/server";
import { getRepoHealth } from "@/lib/github/repos";
import { isGitHubApiError } from "@/lib/github/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params;
    const health = await getRepoHealth(owner, repo);
    return NextResponse.json(health);
  } catch (error) {
    // isGitHubApiError only matches octokit-shaped errors (status/response).
    // A plain Error still has to surface its message, which is what the
    // previous `catch (error: any)` did for every throw.
    const apiError = isGitHubApiError(error) ? error : undefined;
    const message =
      apiError?.message ?? (error instanceof Error ? error.message : undefined);
    return NextResponse.json(
      { error: message || "Failed to fetch repo" },
      { status: apiError?.status || 500 }
    );
  }
}
