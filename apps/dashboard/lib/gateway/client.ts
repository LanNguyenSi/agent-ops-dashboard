/**
 * Server-side gateway client for Next.js proxy routes.
 *
 * Resolves the gateway base URL + GATEWAY_TOKEN once and exposes a small
 * `gatewayFetch()` that automatically attaches `Authorization: Bearer <token>`.
 * If the token is missing, the gateway returns 503 — this is intentional, and
 * the proxy surfaces it as 503 to the caller too rather than silently
 * dropping credentials.
 */

export const GATEWAY_BASE_URL =
  process.env.GATEWAY_INTERNAL_URL ?? "http://agent-ops-gateway:3001";

const GATEWAY_TOKEN = (process.env.GATEWAY_TOKEN ?? "").trim();

export function gatewayAuthHeader(): Record<string, string> {
  if (!GATEWAY_TOKEN) return {};
  return { authorization: `Bearer ${GATEWAY_TOKEN}` };
}

export async function gatewayFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  if (GATEWAY_TOKEN && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${GATEWAY_TOKEN}`);
  }
  return fetch(`${GATEWAY_BASE_URL}${path}`, { ...init, headers });
}
