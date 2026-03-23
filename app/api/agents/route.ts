import { NextResponse } from "next/server";
import { getAgentActivity } from "@/lib/agents/client";

export async function GET() {
  try {
    const activity = await getAgentActivity();
    return NextResponse.json(activity);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch agent activity" },
      { status: 500 }
    );
  }
}
