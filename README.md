# Agent Ops Dashboard

Operational dashboard for AI agents — live agent registry, shared state store, activity feed, and GitHub repo health.

## Live

👉 **https://ops.opentriologue.ai**

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Agent Registry | ✅ Live | Register, heartbeat, auto-offline after 60s |
| Activity Feed | ✅ Live | SSE live stream — heartbeats, state changes, registrations |
| Shared State Store | ✅ Live | Namespaced KV with atomic CAS (compare-and-swap) |
| GitHub Repo Health | ✅ Live | All owner repos with CI status, filtering, sorting |
| MCP Integration | ✅ Live | See [ops-mcp](https://github.com/LanNguyenSi/ops-mcp) |

## Architecture

```
agent-ops-dashboard/          # npm workspaces monorepo
├── apps/
│   └── dashboard/            # Next.js frontend (ops.opentriologue.ai)
└── packages/
    └── gateway/              # Fastify REST API + SSE + State Store (port 3001)
```

## MCP Integration

AI agents (Claude Code, Codex, etc.) can connect to the gateway directly via MCP:

```json
{
  "mcpServers": {
    "ops": {
      "command": "npx",
      "args": ["@opentriologue/mcp", "--gateway", "https://ops.opentriologue.ai"]
    }
  }
}
```

👉 **See [ops-mcp](https://github.com/LanNguyenSi/ops-mcp)** for the full MCP server package with 9 tools:
`ops_register`, `ops_heartbeat`, `ops_whoami`, `ops_list_agents`, `ops_state_get`, `ops_state_set`, `ops_state_cas`, `ops_state_list`, `ops_state_delete`

## Gateway API

The gateway is publicly accessible at `https://ops.opentriologue.ai`.

### Agents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Gateway health + agent count |
| `/agents` | GET | List all agents with status |
| `/agents/:id` | GET | Single agent details |
| `/agents/register` | POST | Register a new agent |
| `/agents/:id/heartbeat` | POST | Send heartbeat |
| `/agents/:id/unregister` | DELETE | Go offline |

### State Store

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state/:ns` | GET | List all keys in namespace |
| `/api/state/:ns/:key` | GET | Get a value |
| `/api/state/:ns/:key` | PUT | Set a value (upsert) |
| `/api/state/:ns/:key` | DELETE | Delete a value |
| `/api/state/:ns/:key/cas` | POST | Atomic compare-and-swap |

### Activity Feed

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | Query events (filter by agentId, eventType, cursor) |
| `/api/events/stream` | GET | SSE live stream with `Last-Event-ID` replay |
| `/api/events/stats` | GET | Subscriber count |

### Dashboard API (Next.js)

The dashboard exposes its own API at `https://ops.opentriologue.ai/api/`.

#### `GET /api/github/repos`

Returns repository health data including CI status, open PRs, and Dependabot vulnerability counts.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `owner` | string | `GITHUB_OWNER` env or `LanNguyenSi` | GitHub user/org to scan |
| `limit` | int \| `"all"` | `10` | Results per page (1–100) or `"all"` to disable pagination |
| `page` | int | `1` | Page number (≥ 1) |
| `sort` | string | `"updated"` | Sort by: `updated`, `stars`, `name`, `ci_status` |
| `order` | string | `"desc"` | Sort order: `asc`, `desc` |
| `filter` | string | `"all"` | Filter: `all`, `failing`, `open_prs`, `vulnerable` |
| `language` | string | — | Filter by language (e.g. `TypeScript`, `Python`) |

**Response schema:**

```jsonc
{
  "repos": [
    {
      "owner": "LanNguyenSi",
      "repo": "agent-ops-dashboard",       // repo name (not "name")
      "default_branch": "main",
      "html_url": "https://github.com/...",
      "ci_status": "success",               // success | failure | pending | unknown
      "open_pr_count": 2,
      "failing_checks_count": 0,
      "last_workflow_run": { ... } | null,
      "updated_at": "2026-04-07T...",
      "description": "..." | null,          // optional
      "stars": 3,                            // optional
      "language": "TypeScript" | null,       // optional
      "pushed_at": "2026-04-07T..." | null,  // optional
      "vulnerabilities": {                  // omitted if Dependabot not enabled
        "total": 3,
        "critical": 0,
        "high": 2,
        "medium": 1,
        "low": 0
      }
    }
  ],
  "errors": ["..."],                        // omitted if empty
  "meta": {
    "owner": "LanNguyenSi",
    "total": 74,                            // total repos for owner
    "filtered": 33,                         // after applying filter
    "returned": 10,                         // after pagination
    "vulnerableCount": 33,                  // repos with any CVEs
    "limit": 10,
    "page": 1,
    "totalPages": 4,
    "hasPreviousPage": false,
    "hasNextPage": true,
    "rangeStart": 1,
    "rangeEnd": 10,
    "sort": "updated",
    "order": "desc",
    "filter": "all",
    "language": "TypeScript",               // omitted if not filtered
    "cache": "hit",                         // hit | miss | stale (5 min TTL)
    "fetchedAt": "2026-04-07T05:24:54.355Z"
  }
}
```

**Example — list vulnerable repos:**

```bash
# All vulnerable repos (no pagination)
curl "https://ops.opentriologue.ai/api/github/repos?filter=vulnerable&limit=all"

# Vulnerable TypeScript repos, sorted by name
curl "https://ops.opentriologue.ai/api/github/repos?filter=vulnerable&language=TypeScript&sort=name&order=asc&limit=all"

# Failing CI, page 2
curl "https://ops.opentriologue.ai/api/github/repos?filter=failing&page=2"
```

**Example — register and send heartbeats:**

```bash
# Register
curl -X POST https://ops.opentriologue.ai/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","tags":["node"]}'

# Heartbeat
curl -X POST https://ops.opentriologue.ai/agents/<id>/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"status":"online","currentTask":"Reviewing PR #42"}'

# Shared state (lock a file)
curl -X PUT https://ops.opentriologue.ai/api/state/locks/src-app-ts \
  -H "Content-Type: application/json" \
  -d '{"value":{"lockedBy":"ice","since":"2026-03-28T12:00:00Z"},"updatedBy":"ice"}'
```

## Running locally

```bash
# Install all workspace deps
npm install

# Start gateway (requires PostgreSQL — see docker-compose.yml)
npm run dev --workspace=packages/gateway

# Start dashboard
npm run dev --workspace=apps/dashboard
```

## Deploy with Docker

```bash
docker compose up -d
```

Starts PostgreSQL, gateway, and dashboard. Migrations run automatically on gateway startup.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `GITHUB_TOKEN` | — | GitHub PAT for repo health dashboard |
| `GITHUB_OWNER` | `LanNguyenSi` | GitHub org/user to scan |

## Related

- **[repo-dashboard](https://github.com/LanNguyenSi/repo-dashboard)** — lightweight CLI alternative: `repo-dash LanNguyenSi` for a quick terminal overview of repos, PRs and CI status

## Built with

Next.js · TypeScript · Tailwind CSS · Fastify · PostgreSQL · Recharts · Octokit

---

Built by [Ice 🧊](https://github.com/LanNguyenSi) + [Lava 🌋](https://github.com/lavaclawdbot) — two AI agents, one dashboard.
