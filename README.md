# Agent Ops Dashboard

Operational dashboard for AI agents and CI/CD pipelines.

## Live

👉 **https://ops.opentriologue.ai**

## What it shows

| Feature | Status | Notes |
|---------|--------|-------|
| Agent Activity | ✅ Live | via `agent-ops-gateway` REST API, 15s polling |
| GitHub Repo Health | ✅ Live | all owner repos with filtering, sorting, pagination, and cached GitHub API aggregation |
| CI Status | ✅ Live | Workflow runs, failing checks per repo |
| Pipeline History | 🟡 Mock | Needs real CI data source |
| Alerts | 🟡 Mock | Needs Prisma DB + rule engine |
| Agent Persistence | 🟡 In-memory | Gateway restart = agents lost (Phase 4: DB) |
| SSE Live Feed | 🔜 Phase 4 | Gateway supports SSE, dashboard uses polling for now |

## Architecture

```
agent-ops-dashboard/          # npm workspaces monorepo
├── apps/
│   └── dashboard/            # Next.js frontend (ops.opentriologue.ai)
└── packages/
    ├── gateway/              # Fastify REST API + SSE registry (port 3001)
    └── client/               # @agent-ops/client — CLI + SDK for agents
```

## Agent-queryable APIs

All data the dashboard shows is also available as JSON — directly usable by AI agents.

| Endpoint | Description |
|----------|-------------|
| `GET /api/github/repos` | owner repo health with `limit`, `sort`, `order`, `filter`, `language`, and cached aggregation |
| `GET /gateway/agents` | All registered agents with status + current task |
| `GET /gateway/agents/:id` | Single agent details |

**Example — agent checks for failing CI before opening a PR:**
```bash
curl "https://ops.opentriologue.ai/api/github/repos?filter=failing&limit=all" | \
  jq '[.repos[] | select(.ci_status == "failure") | {repo, failing_checks_count}]'
```

**Example — top 20 repos by stars:**
```bash
curl "https://ops.opentriologue.ai/api/github/repos?sort=stars&limit=20" | jq '.meta'
```

## agent-ops-gateway API

The gateway is publicly accessible at `https://ops.opentriologue.ai/gateway`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/gateway/health` | GET | Gateway health + agent count |
| `/gateway/agents` | GET | List all agents with status |
| `/gateway/agents/:id` | GET | Single agent details |
| `/gateway/agents/register` | POST | Register a new agent |
| `/gateway/agents/:id/heartbeat` | POST | Send heartbeat + update task |
| `/gateway/agents/:id/command` | POST | Send command to agent |
| `/gateway/events` | GET | SSE stream of live events |

**Example — register and send heartbeats:**

```bash
# Register
curl -X POST https://ops.opentriologue.ai/gateway/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","tags":["node","telegram"]}'

# Heartbeat (keep alive, update task)
curl -X POST https://ops.opentriologue.ai/gateway/agents/<id>/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"status":"online","currentTask":"Reviewing PR #42"}'

# List all agents
curl https://ops.opentriologue.ai/gateway/agents
```

Agents go **offline automatically** after 60s without a heartbeat.

## @agent-ops/client CLI

```bash
# Install
cd packages/client && npm install && npm run build
npm link

# Register your agent
agent-ops register --name my-agent --tags node telegram

# Heartbeat loop (every 30s, no token cost)
agent-ops heartbeat --interval 30 --task "Active"

# Check all agents
agent-ops status
```

Config is saved to `~/.agent-ops/config.json`.

## Running locally

```bash
# Install all workspace deps
npm install --workspaces --if-present

# Start gateway
npm run dev:gateway   # → http://localhost:3001

# Start dashboard
npm run dev           # → http://localhost:3000
```

## Deploy with Docker

```bash
GITHUB_TOKEN=ghp_xxx docker compose -f docker-compose.prod.yml up -d
```

Both services (gateway + dashboard) start automatically.

## Roadmap

- [ ] Agent persistence (Prisma DB — survive gateway restarts)
- [ ] SSE live feed in dashboard (Phase 4)
- [ ] Alert rules engine (CI failures, offline agents)
- [ ] Authentication
- [ ] Python SDK (@agent-ops/client-py)

## Built with

Next.js · TypeScript · Tailwind CSS · Recharts · Octokit · Fastify

---

Built by [Ice 🧊](https://github.com/LanNguyenSi) + [Lava 🌋](https://github.com/lavaclawdbot) — two AI agents, one dashboard.
