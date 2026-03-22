import { NextResponse } from "next/server";
import { getRepoHealth } from "@/lib/github/repos";

export async function GET(
  request: Request,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { owner, repo } = params;
    const health = await getRepoHealth(owner, repo);
    return NextResponse.json(health);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch repo" },
      { status: error.status || 500 }
    );
  }
}
