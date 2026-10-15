import { NextResponse } from "next/server";
import {
  AgentSourceError,
  AgentSourceNotConfiguredError,
  getAgentActivity,
} from "@/lib/agents/client";

export async function GET() {
  try {
    const activity = await getAgentActivity();
    return NextResponse.json(activity);
  } catch (error) {
    if (error instanceof AgentSourceNotConfiguredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    if (error instanceof AgentSourceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch agent activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
