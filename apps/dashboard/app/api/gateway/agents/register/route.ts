import { NextRequest, NextResponse } from "next/server";

const GATEWAY = process.env.GATEWAY_INTERNAL_URL ?? "http://gateway:3001";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as unknown;
    const res = await fetch(`${GATEWAY}/agents/register`, {
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
