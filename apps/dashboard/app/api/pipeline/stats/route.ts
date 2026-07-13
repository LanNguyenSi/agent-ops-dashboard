import { NextResponse } from "next/server";
import { getPipelineRuns } from "@/lib/pipeline/service";
import { calculateStats } from "@/lib/pipeline/analytics";

export async function GET() {
  try {
    const runs = await getPipelineRuns({ limit: 100 });
    const stats = calculateStats(runs);
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch pipeline stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
