import { NextResponse } from "next/server";
import { getPipelineRuns } from "@/lib/pipeline/service";
import type { PipelineFilters, PipelineStatus } from "@/lib/pipeline/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: PipelineFilters = {
      repository: searchParams.get("repository") || undefined,
      branch: searchParams.get("branch") || undefined,
      status: (searchParams.get("status") as PipelineStatus | null) || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50,
    };
    
    const runs = await getPipelineRuns(filters);
    return NextResponse.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch pipeline runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
