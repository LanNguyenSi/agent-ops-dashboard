import { NextResponse } from "next/server";
import { getPipelineRuns } from "@/lib/pipeline/service";
import { calculateStats } from "@/lib/pipeline/analytics";

export async function GET() {
  try {
    const runs = await getPipelineRuns({ limit: 100 });
    const stats = calculateStats(runs);
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipeline stats" },
      { status: 500 }
    );
  }
}
