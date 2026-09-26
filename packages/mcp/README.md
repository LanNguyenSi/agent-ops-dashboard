# @opentriologue/mcp

MCP server for the [Triologue](https://opentriologue.ai) agent-ops platform.

> Imported from the former `LanNguyenSi/ops-mcp` standalone repo into this monorepo as `packages/mcp/`. Build, tests, and npm publishing remain identical. The standalone repo will be archived.

## Overview

`@opentriologue/mcp` exposes the agent-ops gateway as MCP Tools, so AI agents (Claude, GPT, and others) can register, send heartbeats, and manage shared state through the Model Context Protocol instead of calling the gateway's REST API directly. It depends on `@opentriologue/client` for the gateway request logic and shared domain types.

```
Claude / AI Agent
      |
      |  MCP (stdio)
      v
@opentriologue/mcp
      |
      |  HTTP REST
      v
agent-ops-gateway  ---- PostgreSQL (state + events)
      |
      |  SSE
      v
ops.opentriologue.ai (dashboard)
```

Node.js 20 or newer is required (see `engines` in package.json).

## Key features

- Agent tools: register, heartbeat, whoami, list agents.
- State tools: get, set, atomic compare-and-swap, list, delete, on the gateway's namespaced shared state store.
- Reads its gateway URL and token from environment variables, so it drops into any MCP-capable client's config.

## Install / quick start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "opentriologue": {
      "command": "npx",
      "args": ["-y", "@opentriologue/mcp"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_TOKEN": "your-gateway-token"
      }
    }
  }
}
```

### Manual

```bash
GATEWAY_URL=http://localhost:3001 GATEWAY_TOKEN=your-gateway-token npx @opentriologue/mcp
```

## Usage

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `GATEWAY_URL` | yes | URL of agent-ops-gateway. The server exits at startup if this is unset. |
| `GATEWAY_TOKEN` | required for a secured gateway | Bearer token sent as `Authorization: Bearer <token>` on every gateway call. Required whenever the target gateway has `GATEWAY_TOKEN` set, which guards every route except `/health` in a standard deployment; without it those routes return `401`/`503`. |
| `AGENT_ID` | optional | Default agent ID for `ops_whoami` / `ops_heartbeat`. |

### Available tools

Agent tools:

- `ops_register`: register a new agent with the gateway.
- `ops_heartbeat`: send a heartbeat to keep the agent alive.
- `ops_whoami`: get info about the current agent.
- `ops_list_agents`: list all registered agents.

State tools:

- `ops_state_get`: get a value from the shared state store.
- `ops_state_set`: set a value in the shared state store.
- `ops_state_cas`: atomic compare-and-swap (conflict-safe updates).
- `ops_state_list`: list all keys in a namespace.
- `ops_state_delete`: delete a key from the state store.

## Documentation

- [Gateway API reference](../../docs/api.md), the REST endpoints these tools call.
- [Root README](../../README.md), for running a gateway to point this server at.

## Development

```bash
npm run build      # Build TypeScript
npm run dev         # Run src/index.ts directly with tsx
npm test            # Run the test suite (vitest, with coverage)
```

### Publishing

`@opentriologue/mcp` depends on `@opentriologue/client` for shared domain types. Publish order: `@opentriologue/client` first, then `@opentriologue/mcp`.

Trigger the [`Publish @opentriologue/client`](../../.github/workflows/publish-client.yml) workflow first (Actions tab, Run workflow), then [`Publish @opentriologue/mcp`](../../.github/workflows/publish-mcp.yml). Both have a `dry-run` boolean input, run the dry-run path first to verify the tarball before the real publish (note: the dry-run does not exercise the publish auth path). Publishing is tokenless via npm Trusted Publishing (OIDC): each package needs its Trusted Publisher entry on npmjs.com (repo `LanNguyenSi/agent-ops-dashboard`, workflow `publish-client.yml` and `publish-mcp.yml` respectively); no `NPM_TOKEN` secret is required.

## License

MIT
