import { NextResponse } from "next/server";
import { getAlerts, getStats } from "@/lib/alerts/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    
    const alerts = await getAlerts();
    
    if (includeStats) {
      const stats = await getStats();
      return NextResponse.json({ alerts, stats });
    }
    
    return NextResponse.json({ alerts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
