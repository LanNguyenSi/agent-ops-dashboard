# @opentriologue/mcp

MCP server for the [Triologue](https://opentriologue.ai) agent-ops platform.

> Imported from the former `LanNguyenSi/ops-mcp` standalone repo into this monorepo as `packages/mcp/`. Build, tests, and npm publishing remain identical. The standalone repo will be archived.

Exposes the agent-ops gateway as MCP Tools, allowing AI agents (Claude, GPT, etc.)
to register, send heartbeats, and manage shared state through the Model Context Protocol.

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "opentriologue": {
      "command": "npx",
      "args": ["-y", "@opentriologue/mcp"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001"
      }
    }
  }
}
```

### Manual

```bash
GATEWAY_URL=http://localhost:3001 npx @opentriologue/mcp
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GATEWAY_URL` | ✅ | URL of agent-ops-gateway |
| `AGENT_ID` | optional | Default agent ID for `ops_whoami` / `ops_heartbeat` |

## Available Tools

### Agent Tools
- `ops_register`: register a new agent with the gateway
- `ops_heartbeat`: send a heartbeat to keep the agent alive
- `ops_whoami`: get info about the current agent
- `ops_list_agents`: list all registered agents

### State Tools
- `ops_state_get`: get a value from the shared state store
- `ops_state_set`: set a value in the shared state store
- `ops_state_cas`: atomic compare-and-swap (conflict-safe updates)
- `ops_state_list`: list all keys in a namespace
- `ops_state_delete`: delete a key from the state store

## Publishing

`@opentriologue/mcp` depends on `@agent-ops/client` for shared domain types. Publish order: `@agent-ops/client` first, then `@opentriologue/mcp`.

Trigger the [`Publish @agent-ops/client`](../../.github/workflows/publish-client.yml) workflow first (Actions tab, Run workflow), then [`Publish @opentriologue/mcp`](../../.github/workflows/publish-mcp.yml). Both have a `dry-run` boolean input, run the dry-run path first to verify the tarball before the real publish. Both require the `NPM_TOKEN` repository secret.

## Architecture

```
Claude / AI Agent
      │
      │  MCP (stdio)
      ▼
@opentriologue/mcp
      │
      │  HTTP REST
      ▼
agent-ops-gateway  ──── PostgreSQL (state + events)
      │
      │  SSE
      ▼
ops.opentriologue.ai (dashboard)
```
