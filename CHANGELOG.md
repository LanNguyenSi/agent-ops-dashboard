# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-05-01

**Headline: Absorbed the former `LanNguyenSi/ops-mcp` standalone repo as `packages/mcp`, established the npm publish flow for `@opentriologue/mcp`, and killed type drift between the MCP wrapper and the gateway client.**

### Added

#### MCP server (`packages/mcp`, `@opentriologue/mcp`)

- **Imported as workspace** (#33). Source byte-identical to `LanNguyenSi/ops-mcp@master`. Mirrors the existing `packages/gateway` and `packages/client` layout: own `package.json`, `tsconfig.json`, `vitest.config.ts`. Package name unchanged (`@opentriologue/mcp`), `publishConfig.access: public` preserved. The standalone GitHub repo can now be archived.
- **Manual publish workflow** (#34). `.github/workflows/publish-mcp.yml`, `workflow_dispatch` only, with a `dry-run` boolean input that runs `npm publish --dry-run` against npm without uploading. The real publish step uses `NODE_AUTH_TOKEN: secrets.NPM_TOKEN`. Permissions: `contents: read`.

#### Client (`packages/client`, `@agent-ops/client`)

- **State-store types** mirror `packages/gateway/src/state/state.schema.ts`: `StateEntry`, `StateKeyInfo`, `StateListResult`, `CasConflictError`. The client SDK now describes the full agent-ops surface (registry + state) at the type level.

### Changed

- **Type drift killed** (#35). `packages/mcp/src/types.ts` becomes a re-export shim: `Agent`, `AgentStatus`, `RegisterPayload`, `HeartbeatPayload`, plus the new state-store types are pulled from `@agent-ops/client`. `RegisterAgentInput` is an alias for `RegisterPayload`. `RegisterAgentResult` becomes `Pick<Agent, "id" | "name" | "status" | "registeredAt">`. `Agent.lastSeen` tightened from `string | null` to `string` (verified against `packages/gateway/src/registry.ts`, which never returns null), `tags` from optional to required, `status` to the strict `AgentStatus` union.
- `packages/mcp` adds `@agent-ops/client` as a workspace dependency. Build order: client builds before mcp.
- `@modelcontextprotocol/sdk` pinned to `~1.28.0` in `packages/mcp` (1.29.0 triggers `TS2589 Type instantiation is excessively deep` when resolved through the workspace).
- `packages/mcp/tsconfig.json` excludes `*.test.ts` / `*.spec.ts` from compilation so `dist/` ships only runtime files.
- `packages/mcp/package.json` `repository.url` points at the new monorepo path with `directory: "packages/mcp"`.

### Removed

- `LanNguyenSi/ops-mcp` standalone repo removed from the README's external companion list, since it now lives as `packages/mcp/` inside this monorepo. The README's "Companion projects" section is renamed to "Other ways in" to reflect the change.

### Repository structure

```
agent-ops-dashboard/
├── apps/
│   └── dashboard/            # Next.js frontend (ops.opentriologue.ai)
└── packages/
    ├── gateway/              # Fastify REST API + SSE + State Store
    ├── client/               # @agent-ops/client CLI + SDK
    └── mcp/                  # @opentriologue/mcp, MCP server for AI agents (new)
```

### Verification

- `npm run build` (all four workspaces): green; client builds before mcp via the new dependency.
- `npm test`: 99 tests pass (gateway 64, mcp 35).
- `npm publish --workspace=@opentriologue/mcp --dry-run`: 10.1 kB tarball, 30 files.

## [0.1.0] - 2026-04-15

**Headline: First tagged release of the agent-ops dashboard — a unified
ops view for repo health, agent activity, and live agent registry with
persistent state, deployed to production via agent-relay.**

This is the baseline release. Everything below describes the feature set
the dashboard ships with today, carved out of the monorepo's full
history (`apps/dashboard`, `packages/gateway`, `packages/client`).

### Added

#### Dashboard

- **Repo health dashboard** — multi-repo overview backed by the GitHub
  API, with a Sync button that clears the GitHub cache and forces a
  fresh fetch.
- **Activity feed tab** — live agent events via Server-Sent Events,
  with sessionStorage persistence so events survive page navigation,
  Last-Event-ID replay, named-event listeners, and agent-ID → name
  resolution through `/api/gateway/agents`. Styling aligned with the
  dashboard design system.
- **Dashboard API for agent consumption** — documented HTTP surface
  for external agents to read repo and activity state.

#### Gateway (`packages/gateway`)

- **PostgreSQL state store** — `agent_state` table with full CRUD +
  compare-and-swap semantics (12 tests).
- **Agent registry** — `agent-registry.json` persisted on a named
  Docker volume so agents survive rebuilds; agents restart in
  `offline` state and heartbeat re-activates them.
- **Activity events** — `agent_events` table + SSE
  `/api/events/stream` with Last-Event-ID replay (21 tests).
- **Register / heartbeat proxy routes** —
  `/api/gateway/agents/register` and `/heartbeat`.
- **SSE proxy through Next.js** — dashboard can reach the gateway
  even when the browser can't touch the internal Docker URL.
- **32 gateway tests** covering SSE leak and validation paths.
- **SQL migrations** copied into the Docker build output.

#### Deployment & ops

- **Traefik + agent-relay deployment** — `.relay.yml` descriptor
  consumed by `agent-relay` for VPS rollouts; `env_file` upstreamed
  to the VPS-local compose override; gateway bound to localhost on
  the host.
- **GitHub token via env vars**, never checked into compose.
- **Cross-references** — README links to `depsight`, `ops-mcp`,
  `lava-ice-logs/ENGINEERING.md`, and the repo-dashboard CLI, so
  operators can navigate the wider ops-stack.

### Fixed

- **Security** — axios ≥ 1.15.0, next ≥ 16.2.3, eslint 10, picomatch
  high-severity bumps; additional sweep of HIGH vulnerabilities.
- **Repo scoping** — `listAllReposForUser` now scopes by owner and
  returns `full_name` so multi-account setups don't leak across
  projects.

### Release infrastructure

- This release introduces `.github/workflows/release.yml`, triggered
  on `v*` tags. It reuses the existing `ci.yml` via `workflow_call`,
  extracts this CHANGELOG section for the tagged version, and
  publishes the GitHub Release via `softprops/action-gh-release@v2`.
- Root `package.json` version aligned at `0.1.0` to match the tag.
  Workspace packages (`apps/dashboard`, `packages/gateway`,
  `packages/client`) keep their own versions and can be tagged
  independently in the future.
