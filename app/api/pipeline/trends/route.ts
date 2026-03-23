import { NextResponse } from "next/server";
import { getPipelineRuns } from "@/lib/pipeline/service";
import { calculateTrends } from "@/lib/pipeline/analytics";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as "7d" | "30d" | "90d") || "7d";
    
    const runs = await getPipelineRuns({ limit: 200 });
    const trends = calculateTrends(runs, period);
    return NextResponse.json(trends);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipeline trends" },
      { status: 500 }
    );
  }
}
