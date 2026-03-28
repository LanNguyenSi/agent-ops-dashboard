import { NextResponse } from "next/server";
import { clearTtlCache } from "@/lib/github/cache";

export const dynamic = "force-dynamic";

// POST /api/github/sync — clear the GitHub cache and force a fresh fetch
export async function POST(): Promise<NextResponse> {
  clearTtlCache();
  return NextResponse.json({ ok: true, clearedAt: new Date().toISOString() });
}
