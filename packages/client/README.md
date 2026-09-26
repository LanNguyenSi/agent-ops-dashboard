# @opentriologue/client

CLI and SDK for the Triologue agent-ops platform: register agents, send heartbeats, and query agent status against an agent-ops gateway.

## Overview

`@opentriologue/client` wraps the agent-ops gateway's REST API in a small SDK (`AgentOpsClient`) and a `agent-ops` command-line tool built on top of it. It is the package that both `@opentriologue/mcp` and standalone scripts use to talk to a gateway: register an agent, push heartbeats, read the shared agent registry, and manage a local config file for the CLI. Node.js 18 or newer is required (see `engines` in package.json).

## Key features

- `agent-ops` CLI: register, heartbeat, status, config commands.
- `AgentOpsClient` SDK class for programmatic access from Node/TypeScript.
- Local config file (`~/.agent-ops/config.json`) so the CLI remembers the gateway URL and the last registered agent.
- Bearer-token auth support for a gateway that requires `GATEWAY_TOKEN`.

## Install / quick start

```bash
npm install @opentriologue/client
# or globally, to get the agent-ops binary on PATH
npm install -g @opentriologue/client
```

```bash
agent-ops register --name ice --tags openclaw telegram
agent-ops heartbeat --task "Reviewing PR #42"
agent-ops status
```

## Usage

### CLI

```bash
# Register an agent
agent-ops register --name ice --tags openclaw telegram

# One-time heartbeat
agent-ops heartbeat --task "Reviewing PR #42"

# Background heartbeat loop (every 30 seconds)
agent-ops heartbeat --interval 30 --task "Active coding session"

# List all agents
agent-ops status

# Show the resolved configuration
agent-ops config
```

### SDK

```typescript
import { AgentOpsClient } from '@opentriologue/client';

const client = new AgentOpsClient('http://localhost:3001', {
  token: process.env.AGENT_OPS_GATEWAY_TOKEN, // required when the gateway has GATEWAY_TOKEN set
});

const agent = await client.register({
  name: 'my-agent',
  tags: ['nodejs', 'worker'],
  meta: { version: '1.0.0' },
});

await client.heartbeat(agent.id, {
  status: 'busy',
  currentTask: 'Processing data...',
});

const agents = await client.getAgents();
```

### Configuration

The CLI stores its config in `~/.agent-ops/config.json`:

```json
{
  "gatewayUrl": "http://localhost:3001",
  "agentId": "agent-123",
  "agentName": "ice"
}
```

Environment variables:

- `AGENT_OPS_GATEWAY_URL`: overrides the default gateway URL (`http://localhost:3001`).
- `AGENT_OPS_GATEWAY_TOKEN`: sets the Bearer token sent as `Authorization: Bearer <token>` on every gateway call. Required when the gateway has `GATEWAY_TOKEN` set (the default in production); without it, calls to a secured gateway fail with `401`.

## Documentation

- [Gateway API reference: Agents](../../docs/api.md#gateway-agents), the endpoints this client calls.
- [Root README](../../README.md), for running a gateway to point the client at.

## Development

```bash
npm run build     # Build TypeScript
npm run dev       # Watch mode
npm run clean     # Remove dist/
npm test          # Run the test suite (vitest, with coverage)
```

## License

MIT
