/**
 * SSE proxy: browser → Next.js → gateway
 * Required because GATEWAY_INTERNAL_URL (http://gateway:3001) is a Docker-internal
 * hostname that browsers cannot reach directly. The Next layer also attaches the
 * Bearer token so browsers (whose EventSource API can't set headers) can stream
 * authenticated events.
 */
import { gatewayFetch } from "@/lib/gateway/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  if (searchParams.get("agentId")) params.set("agentId", searchParams.get("agentId")!);
  if (searchParams.get("eventType")) params.set("eventType", searchParams.get("eventType")!);

  const lastEventId = req.headers.get("last-event-id");
  const headers: Record<string, string> = {};
  if (lastEventId) headers["last-event-id"] = lastEventId;

  const upstream = await gatewayFetch(
    `/api/events/stream${params.size ? `?${params}` : ""}`,
    { headers, signal: req.signal },
  );

  // Upstream may have refused with 401/503 + JSON; in that case forward as-is
  // so the browser can read the actual error instead of an empty event stream.
  if (!upstream.ok) {
    const ct = upstream.headers.get("content-type") ?? "application/json";
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": ct },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
