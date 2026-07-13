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
    const apiError = isGitHubApiError(error) ? error : undefined;
    return NextResponse.json(
      { error: apiError?.message || "Failed to fetch repo" },
      { status: apiError?.status || 500 }
    );
  }
}
