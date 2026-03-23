import { NextResponse } from "next/server";
import { getPipelineRuns } from "@/lib/pipeline/service";
import type { PipelineFilters } from "@/lib/pipeline/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: PipelineFilters = {
      repository: searchParams.get("repository") || undefined,
      branch: searchParams.get("branch") || undefined,
      status: (searchParams.get("status") as any) || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50,
    };
    
    const runs = await getPipelineRuns(filters);
    return NextResponse.json({ runs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipeline runs" },
      { status: 500 }
    );
  }
}
