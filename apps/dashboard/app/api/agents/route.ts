import { NextResponse } from "next/server";
import { getAgentActivity } from "@/lib/agents/client";

export async function GET() {
  try {
    const activity = await getAgentActivity();
    return NextResponse.json(activity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch agent activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
