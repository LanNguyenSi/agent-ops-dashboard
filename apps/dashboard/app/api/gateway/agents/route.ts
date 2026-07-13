import { NextResponse } from "next/server";
import { gatewayFetch } from "@/lib/gateway/client";

export async function GET() {
  try {
    const res = await gatewayFetch(`/agents`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Gateway ${res.status}`);
    const agents = await res.json();
    return NextResponse.json(agents);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gateway unreachable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
