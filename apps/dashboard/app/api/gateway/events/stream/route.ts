/**
 * SSE proxy: browser → Next.js → gateway
 * Required because GATEWAY_INTERNAL_URL (http://gateway:3001) is a Docker-internal
 * hostname that browsers cannot reach directly.
 */

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL ?? "http://agent-ops-gateway:3001";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  if (searchParams.get("agentId")) params.set("agentId", searchParams.get("agentId")!);
  if (searchParams.get("eventType")) params.set("eventType", searchParams.get("eventType")!);

  const lastEventId = req.headers.get("last-event-id");
  const headers: Record<string, string> = {};
  if (lastEventId) headers["last-event-id"] = lastEventId;

  const upstream = await fetch(
    `${GATEWAY_URL}/api/events/stream${params.size ? `?${params}` : ""}`,
    { headers, signal: req.signal }
  );

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
