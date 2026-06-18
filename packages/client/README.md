# @opentriologue/client

CLI and SDK for agent-ops monitoring system.

## Installation

```bash
npm install @opentriologue/client
# or globally
npm install -g @opentriologue/client
```

## CLI Usage

### Register an agent

```bash
agent-ops register --name ice --tags openclaw telegram
```

### Send heartbeat

```bash
# One-time heartbeat
agent-ops heartbeat --task "Reviewing PR #42"

# Background heartbeat loop (every 30 seconds)
agent-ops heartbeat --interval 30 --task "Active coding session"
```

### Show all agents

```bash
agent-ops status
```

### Show configuration

```bash
agent-ops config
```

## SDK Usage

```typescript
import { AgentOpsClient } from '@opentriologue/client';

const client = new AgentOpsClient('http://localhost:3001', {
  token: process.env.AGENT_OPS_GATEWAY_TOKEN, // required when the gateway has GATEWAY_TOKEN set
});

// Register
const agent = await client.register({
  name: 'my-agent',
  tags: ['nodejs', 'worker'],
  meta: { version: '1.0.0' }
});

// Heartbeat
await client.heartbeat(agent.id, {
  status: 'busy',
  currentTask: 'Processing data...'
});

// Get all agents
const agents = await client.getAgents();
```

## Configuration

Config is stored in `~/.agent-ops/config.json`:

```json
{
  "gatewayUrl": "http://localhost:3001",
  "agentId": "agent-123",
  "agentName": "ice"
}
```

Environment variables:

- `AGENT_OPS_GATEWAY_URL` overrides the default gateway URL (`http://localhost:3001`).
- `AGENT_OPS_GATEWAY_TOKEN` sets the Bearer token sent as `Authorization: Bearer <token>` on every gateway call. Required when the gateway has `GATEWAY_TOKEN` set (the default in production); without it, calls to a secured gateway fail with `401`.

## Development

```bash
npm run build     # Build TypeScript
npm run dev       # Watch mode
npm run clean     # Remove dist/
```

## License

MIT
