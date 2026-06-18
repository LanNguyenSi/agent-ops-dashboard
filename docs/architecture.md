# Architecture

agent-ops-dashboard is an npm-workspaces monorepo with two deployable units, a managed PostgreSQL instance, and an external GitHub integration.

```
agent-ops-dashboard/
├── apps/
│   └── dashboard/            # Next.js frontend + dashboard API (port 3000)
└── packages/
    ├── gateway/              # Fastify REST + SSE + state store (port 3001)
    ├── client/               # @opentriologue/client CLI + SDK (npm package, not deployed)
    └── mcp/                  # @opentriologue/mcp MCP server (npm package, not deployed)
```

The two deployable units are `apps/dashboard` and `packages/gateway`; `packages/client` and `packages/mcp` are published npm packages, not part of the running deployment.

## Components

### Gateway (`packages/gateway`)

A small Fastify service responsible for everything agents talk to directly:

- **Agent registry** (`src/registry.ts`): in-memory `Map<id, Agent>` with a per-agent timer that flips status to `offline` after 60s without a heartbeat. The registry persists to `REGISTRY_FILE` (default `agent-registry.json`) on every mutation, and on boot it reloads agents but forces them to `offline` until they next heartbeat. This avoids stale "online" rows after a redeploy.
- **State store** (`src/state/`): namespaced JSON KV with optimistic concurrency. Each entry stores a monotonically increasing `version`; the `cas` route checks `expectedVersion` against the current row inside a single SQL statement. Validation uses zod (`PutStateSchema`, `CasStateSchema`).
- **Activity feed** (`src/events/`): every meaningful registry or state mutation appends a row to `agent_events` and broadcasts the row to active SSE subscribers.

The gateway boots in two modes depending on `DATABASE_URL`:

- With a database: runs migrations on startup, registers state and event routes, and persists every event.
- Without a database: still serves the agent registry and an in-memory SSE stream, but the state store and event log are unavailable. This is intentional, the gateway is the source of truth for live agents and should never fail to start because the database is down.

### Dashboard (`apps/dashboard`)

Next.js 16 App Router. The `/app/api/*` routes do three jobs:

1. **GitHub integration**: `app/api/github/*` calls the GitHub REST API via Octokit (`GITHUB_TOKEN`), aggregates CI status, open PRs, and Dependabot vulnerability counts per repo, and caches the result for 5 minutes.
2. **Pipeline analytics**: `app/api/pipeline/*` reads workflow runs across the configured `GITHUB_REPOS` set and produces stats and trend charts rendered with Recharts on the client.
3. **Gateway proxies**: `app/api/gateway/*` are thin server-side proxies onto the gateway so that browser clients can hit `/api/gateway/*` from the same origin and avoid CORS gymnastics. They also let server components do agent calls without leaking `GATEWAY_INTERNAL_URL` to the browser.

Browser components subscribe to `/api/gateway/events/stream` for the live agent and state feed, and poll `/api/github/repos` (with an `EventSource` fallback for some panels).

### PostgreSQL

The gateway requires PostgreSQL when state-store and persistent activity-feed features are needed. Migrations live in `packages/gateway/src/db/migrations` and are applied on startup by `runMigrations()` in `src/db/migrate.ts`.

Schema highlights:

- `agent_state` (namespace, key, value JSONB, version, updated_by, updated_at, created_at) with unique `(namespace, key)`, plus single-column indexes on `namespace` and `updated_at DESC`.
- `agent_events` (id BIGSERIAL, agent_id, event_type, payload JSONB, created_at). Single-column indexes on `agent_id`, `event_type`, and `created_at DESC` support filtered tail reads; the BIGSERIAL primary key already orders rows for `Last-Event-ID` replays.

## SSE design

Two streams exist:

- `/events` on the gateway, broadcasts the *registry* SSE stream: snapshots, `agent:registered`, `agent:updated`, `agent:offline`, `agent:command`. New connections receive a `snapshot` frame on connect.
- `/api/events/stream` on the gateway, the *durable activity feed*. Frames include `id:`, `event:`, and `data:`. On reconnect the client supplies `Last-Event-ID: <id>`, and the server queries `agent_events` for everything strictly greater than that id (capped at 200) before resuming live broadcasts. This is what prevents holes in the timeline during a network blip or rolling deploy.

Subscribers are per-request closures registered with `eventService.subscribe({ matches, send })`, and the broadcaster removes any subscriber whose `send` throws (typically a closed socket). A 30s keepalive comment (`: heartbeat\n\n`) keeps proxies from closing idle connections; reverse proxies must not buffer (`X-Accel-Buffering: no` is set in the response headers).

## GitHub integration

`apps/dashboard/lib` wraps Octokit with a small caching layer. The repo-health pipeline:

1. List repos for the configured owner with `GET /users/{owner}/repos` (or `/orgs/{owner}/repos`).
2. For each repo, fetch the latest workflow run on `default_branch`, the open-PR count, and (best-effort) Dependabot alert summary.
3. Apply the request's `filter`, `language`, `sort`, and `order` selectors, then paginate.
4. Cache the merged result for 5 minutes keyed by the request's filter/sort signature; `meta.cache` reports `hit`, `miss`, or `stale`.

Errors from individual repos (e.g. forks where Dependabot is unavailable) are collected into `errors[]` rather than failing the whole response.

## Deployment

Production runs three containers under `docker-compose.prod.yml`:

- `postgres:16-alpine` with a named volume for data.
- The gateway container, port `3001` exposed inside the compose network.
- The dashboard container, port `3000`, attached to the external `traefik` network with Traefik labels for `Host(\`ops.opentriologue.ai\`)` and Let's Encrypt TLS.

Migrations run automatically on gateway startup; there is no separate migrate step. See [configuration.md](configuration.md) for the env vars each container needs.
