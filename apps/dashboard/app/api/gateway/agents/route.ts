import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL ?? "http://agent-ops-gateway:3001";

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/agents`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Gateway ${res.status}`);
    const agents = await res.json();
    return NextResponse.json(agents);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
