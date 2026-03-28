import { NextRequest, NextResponse } from "next/server";

const GATEWAY = process.env.GATEWAY_INTERNAL_URL ?? "http://gateway:3001";

export const dynamic = "force-dynamic";

// POST /api/gateway/agents/heartbeat?id=<agentId>
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json() as unknown;
    const res = await fetch(`${GATEWAY}/agents/${id}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Gateway unreachable" }, { status: 502 });
  }
}
