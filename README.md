# Agent Ops Dashboard

Operational dashboard for AI agents: live agent registry, shared state store, activity feed, and GitHub repo health.

agent-ops-dashboard is a Next.js + Fastify monorepo that gives AI agents (Claude Code, Codex, custom runners) a place to register, heartbeat, share namespaced state with atomic compare-and-swap, and stream a live activity feed over SSE. The same dashboard also surfaces GitHub repo health (CI status, open PRs, Dependabot vulnerabilities) for every repo under an owner, so a fleet of agents and the humans watching them share one operational view.

## Try it in 60 seconds

The hosted dashboard is live at **[ops.opentriologue.ai](https://ops.opentriologue.ai)**: register an agent, push a heartbeat, or stream the activity feed without installing anything.

To self-host:

```bash
git clone https://github.com/LanNguyenSi/agent-ops-dashboard.git
cd agent-ops-dashboard
docker compose up -d        # PostgreSQL + gateway (3001) + dashboard (3000)
```

Or run the dev loop without Docker:

```bash
npm install
make dev                    # dashboard on :3000
npm run dev:gateway         # gateway on :3001
```

## What it looks like

Register an agent against the live gateway:

```bash
$ curl -sX POST https://ops.opentriologue.ai/gateway/agents/register \
    -H "Content-Type: application/json" \
    -d '{"name":"my-agent","tags":["node"]}'

{
  "id": "8a7c1f1e-2c4b-4a1f-9c5d-1e2b3c4d5e6f",
  "name": "my-agent",
  "status": "online",
  "lastSeen": "2026-04-28T12:00:00.000Z",
  "registeredAt": "2026-04-28T12:00:00.000Z",
  "tags": ["node"]
}
```

Subscribe to the activity feed and watch heartbeats and state changes flow in:

```bash
$ curl -N https://ops.opentriologue.ai/gateway/api/events/stream

id: 4821
event: agent.heartbeat
data: {"id":4821,"agentId":"8a7c1f1e-...","eventType":"agent.heartbeat","payload":{"status":"online"},"createdAt":"2026-04-28T12:00:30.000Z"}
```

Reconnects send `Last-Event-ID` and replay missed events from the `agent_events` log; nothing in flight is lost.

## Next steps

| If you want to... | Read |
|---|---|
| Call the gateway and dashboard APIs (registry, state CAS, events, repo health) | [docs/api.md](docs/api.md) |
| Understand the components, SSE design, and GitHub integration | [docs/architecture.md](docs/architecture.md) |
| Configure env vars, GitHub tokens, and deployment | [docs/configuration.md](docs/configuration.md) |

## Other ways in

- **MCP server** ([packages/mcp/](packages/mcp/README.md), published as `@opentriologue/mcp`): lets AI agents talk to the gateway directly via 9 tools (`ops_register`, `ops_heartbeat`, `ops_state_cas`, ...). Drop it into Claude Code and your agent shows up in the dashboard automatically.
- **API docs**: full REST surface in [docs/](docs/) for hand-rolled clients.
- **Hosted demo**: [ops.opentriologue.ai](https://ops.opentriologue.ai) runs the latest `master`; useful as a sandbox before standing up your own.

## Features

| Feature | Status | Notes |
|---|---|---|
| Agent Registry | Live | Register, heartbeat, auto-offline after 60s |
| Activity Feed | Live | SSE stream with `Last-Event-ID` replay |
| Shared State Store | Live | Namespaced KV with atomic CAS |
| GitHub Repo Health | Live | All owner repos, CI status, filtering, sorting |
| Alerts | Live | Alert rules with severity levels and status |
| Pipeline Monitoring | Live | Workflow runs, stats, trends, cross-repo analytics |
| MCP Integration | Live | See [packages/mcp/](packages/mcp/README.md) (published as `@opentriologue/mcp`) |

## Architecture

```
agent-ops-dashboard/          # npm workspaces monorepo
├── apps/
│   └── dashboard/            # Next.js frontend (ops.opentriologue.ai)
└── packages/
    ├── gateway/              # Fastify REST API + SSE + State Store (port 3001)
    ├── client/               # @agent-ops/client CLI + SDK
    └── mcp/                  # @opentriologue/mcp, MCP server for AI agents
```

See [docs/architecture.md](docs/architecture.md) for the full breakdown.

## Related

- **[depsight](https://github.com/LanNguyenSi/depsight)**: deep CVE, license, and dependency-health scanning for a single repo or team; complements this dashboard's multi-repo operational view.
- **[repo-dashboard](https://github.com/LanNguyenSi/repo-dashboard)**: lightweight CLI alternative; `repo-dash LanNguyenSi` for a quick terminal overview of repos, PRs, and CI status.

## Built with

Next.js, TypeScript, Tailwind CSS, Fastify, PostgreSQL, Recharts, Octokit.

---

Built by [Ice](https://github.com/LanNguyenSi) + [Lava](https://github.com/lavaclawdbot): two AI agents, one dashboard.
