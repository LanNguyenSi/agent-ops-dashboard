# API Reference

agent-ops-dashboard exposes two HTTP surfaces:

1. The **gateway** (Fastify, port 3001): authoritative agent registry, shared state store, and activity feed. Publicly reachable at `https://ops.opentriologue.ai/gateway/` (Traefik routes the `/gateway/` path prefix to the gateway container).
2. The **dashboard** (Next.js, port 3000): GitHub repo health, pipeline analytics, alerts, plus thin proxies onto the gateway for browser clients. Publicly reachable at `https://ops.opentriologue.ai/api/`.

All examples below use the hosted gateway under the `/gateway/` prefix; for self-hosted deployments substitute `http://localhost:3001` (gateway, no prefix) and `http://localhost:3000` (dashboard).

### Authentication

Every gateway route except `GET /health` is protected by a Bearer token. Send `Authorization: Bearer <GATEWAY_TOKEN>` on each gateway request, using the same value configured as `GATEWAY_TOKEN` on the gateway (see [configuration.md](configuration.md)). A request with no token returns `503 GATEWAY_TOKEN_NOT_CONFIGURED` when the gateway itself has no token set, and `401 UNAUTHORIZED` when the token is missing or wrong. The gateway `curl` examples below assume `GATEWAY_TOKEN` is exported in your shell.

The dashboard's own `/api/*` routes (GitHub repo health, pipeline analytics) do not take this header; the dashboard threads the gateway token server-side for its `/api/gateway/*` proxies.

## Gateway: Agents

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Gateway health check, returns `{ status, agents, timestamp }` |
| `/agents` | GET | List all agents with status |
| `/agents/:id` | GET | Single agent details |
| `/agents/register` | POST | Register a new agent, returns `201` with the assigned `id` |
| `/agents/:id/heartbeat` | POST | Send heartbeat (resets the 60s offline timer) |
| `/agents/:id` | DELETE | Remove an agent |
| `/agents/:id/command` | POST | Back-channel command broadcast over SSE |

**Register:**

```bash
curl -X POST https://ops.opentriologue.ai/gateway/agents/register \
  -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","tags":["node"],"meta":{"region":"eu"}}'
```

Response (`201`):

```json
{
  "id": "8a7c1f1e-2c4b-4a1f-9c5d-1e2b3c4d5e6f",
  "name": "my-agent",
  "status": "online",
  "lastSeen": "2026-04-28T12:00:00.000Z",
  "registeredAt": "2026-04-28T12:00:00.000Z",
  "tags": ["node"],
  "meta": { "region": "eu" }
}
```

**Heartbeat:**

```bash
curl -X POST https://ops.opentriologue.ai/gateway/agents/<id>/heartbeat \
  -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"busy","currentTask":"Reviewing PR #42"}'
```

If no heartbeat arrives within 60 seconds the registry flips the agent to `status: "offline"` and emits an `agent:offline` SSE event. Restarting the gateway also marks all known agents offline until their next heartbeat.

## Gateway: State Store

Namespaced key-value store with atomic compare-and-swap, backed by PostgreSQL. Values are JSON objects.

| Endpoint | Method | Description |
|---|---|---|
| `/api/state/:namespace` | GET | List keys in a namespace, returns `{ namespace, count, keys[] }` |
| `/api/state/:namespace/:key` | GET | Get an entry, returns `404` if absent |
| `/api/state/:namespace/:key` | PUT | Upsert an entry, body `{ value, updatedBy? }` |
| `/api/state/:namespace/:key` | DELETE | Delete an entry, returns `204` |
| `/api/state/:namespace/:key/cas` | POST | Atomic compare-and-swap, body `{ expectedVersion, value, updatedBy? }` |

**Set a value:**

```bash
curl -X PUT https://ops.opentriologue.ai/gateway/api/state/locks/src-app-ts \
  -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":{"lockedBy":"ice","since":"2026-04-28T12:00:00Z"},"updatedBy":"ice"}'
```

Response:

```json
{
  "id": "...",
  "namespace": "locks",
  "key": "src-app-ts",
  "value": { "lockedBy": "ice", "since": "2026-04-28T12:00:00Z" },
  "version": 1,
  "updatedBy": "ice",
  "updatedAt": "2026-04-28T12:00:00.000Z",
  "createdAt": "2026-04-28T12:00:00.000Z"
}
```

**Compare-and-swap:**

```bash
curl -X POST https://ops.opentriologue.ai/gateway/api/state/locks/src-app-ts/cas \
  -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expectedVersion":1,"value":{"lockedBy":"lava"},"updatedBy":"lava"}'
```

On version mismatch the gateway returns `409` with `{ error: "CAS_CONFLICT", expectedVersion, actualVersion, message }`. Validation failures return `400` with field-level details.

## Gateway: Activity Feed

| Endpoint | Method | Description |
|---|---|---|
| `/api/events` | GET | Query events: filter by `agentId`, `eventType`, `since` (ISO ts), `cursor`, `limit` (max 200) |
| `/api/events/stream` | GET | SSE live stream with `Last-Event-ID` replay |
| `/api/events/stats` | GET | Active SSE subscriber count |

Recorded event types (see `packages/gateway/src/events/event.service.ts`):

```
agent.registered    agent.heartbeat
state.set           state.deleted
state.cas.success   state.cas.conflict
```

`agent.disconnected` is reserved as a constant but is not currently emitted to the durable event log; offline transitions surface only on the registry SSE stream as `agent:offline`.

**Stream events:**

```bash
curl -N -H "Authorization: Bearer $GATEWAY_TOKEN" https://ops.opentriologue.ai/gateway/api/events/stream

id: 4821
event: agent.heartbeat
data: {"id":4821,"agentId":"8a7c1f1e-...","eventType":"agent.heartbeat","payload":{"status":"online"},"createdAt":"2026-04-28T12:00:30.000Z"}
```

Each frame includes an `id`, `event` type, and JSON `data`. Reconnect with `Last-Event-ID: <last-seen-id>` to replay anything missed while disconnected (up to the most recent 200 events).

## Dashboard: GitHub Repo Health

### `GET /api/github/repos`

Returns repository health for every repo under an owner: CI status, open PR count, Dependabot vulnerabilities.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `owner` | string | `GITHUB_OWNER` env or `LanNguyenSi` | GitHub user/org to scan |
| `limit` | int or `"all"` | `10` | Page size (1 to 100) or `"all"` to disable pagination |
| `page` | int | `1` | Page number, must be >= 1 |
| `sort` | string | `updated` | `updated`, `stars`, `name`, `ci_status` |
| `order` | string | `desc` | `asc`, `desc` |
| `filter` | string | `all` | `all`, `failing`, `open_prs`, `vulnerable` |
| `language` | string | (none) | Filter by language, e.g. `TypeScript` |

**Response shape:**

```jsonc
{
  "repos": [
    {
      "owner": "LanNguyenSi",
      "repo": "agent-ops-dashboard",
      "default_branch": "main",
      "html_url": "https://github.com/...",
      "ci_status": "success",                // success | failure | pending | unknown
      "open_pr_count": 2,
      "failing_checks_count": 0,
      "last_workflow_run": { /* ... */ } ,
      "updated_at": "2026-04-07T...",
      "description": "...",
      "stars": 3,
      "language": "TypeScript",
      "pushed_at": "2026-04-07T...",
      "vulnerabilities": {                   // omitted if Dependabot disabled
        "total": 3, "critical": 0, "high": 2, "medium": 1, "low": 0
      }
    }
  ],
  "errors": ["..."],                          // omitted if empty
  "meta": {
    "owner": "LanNguyenSi",
    "total": 74, "filtered": 33, "returned": 10,
    "vulnerableCount": 33,
    "limit": 10, "page": 1, "totalPages": 4,
    "hasPreviousPage": false, "hasNextPage": true,
    "rangeStart": 1, "rangeEnd": 10,
    "sort": "updated", "order": "desc",
    "filter": "all",
    "cache": "hit",                          // hit | miss | stale (5 min TTL)
    "fetchedAt": "2026-04-07T05:24:54.355Z"
  }
}
```

**Examples:**

```bash
# All vulnerable repos, no pagination
curl "https://ops.opentriologue.ai/api/github/repos?filter=vulnerable&limit=all"

# Vulnerable TypeScript repos, sorted by name
curl "https://ops.opentriologue.ai/api/github/repos?filter=vulnerable&language=TypeScript&sort=name&order=asc&limit=all"

# Failing CI, page 2
curl "https://ops.opentriologue.ai/api/github/repos?filter=failing&page=2"
```

### Dashboard sub-endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Dashboard health check |
| `/api/agents` | GET | Agent activity (proxied + decorated from the gateway) |
| `/api/alerts` | GET | Alert rules and status |
| `/api/pipeline/runs` | GET | Pipeline workflow runs |
| `/api/pipeline/stats` | GET | Pipeline statistics |
| `/api/pipeline/trends` | GET | Pipeline trends over time |
| `/api/gateway/agents` | GET | Gateway agents proxy |
| `/api/gateway/agents/register` | POST | Gateway register proxy |
| `/api/gateway/agents/heartbeat` | POST | Gateway heartbeat proxy |
| `/api/gateway/events/stream` | GET | Gateway SSE proxy |
| `/api/github/checks` | GET | CI check results for monitored repos |
| `/api/github/prs` | GET | Pull request data |
| `/api/github/sync` | POST | Force a refresh of cached repo data |
| `/api/github/repos/[owner]/[repo]` | GET | Single-repo health detail |
