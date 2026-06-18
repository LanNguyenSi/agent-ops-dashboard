# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

> The version headings below are deploy-provenance tags for the hosted app. The private root `package.json` version is not bumped for every tag and may lag the latest entry here; the published npm packages (`@opentriologue/client`, `@opentriologue/mcp`) are versioned independently.

## [0.3.2] - 2026-06-16

Security patch (tsx/esbuild advisories) plus a gateway 404 fix and CI hardening. The published npm packages (`@opentriologue/mcp`, `@opentriologue/client`) are unchanged and not re-released.

### Security

- **Bumped tsx to ^4.22.4** to clear two esbuild advisories: GHSA-gv7w-rqvm-qjhr and GHSA-g7r4-m6w7-qqqr (PR #60). tsx is a dev/build dependency; no runtime change to the deployed gateway or dashboard.

### Fixed

- **`DELETE /agents/:id` now returns 404 when the agent does not exist** (PR #58). Previously the gateway returned 200 on a delete of an unknown agent ID, masking missing-agent bugs in callers.

### Changed

- **CI: fail loudly on dashboard test failures** (PR #59). Removed the `|| echo` mask that was swallowing non-zero exit codes from the dashboard test step, so a real test failure now fails the workflow run instead of silently passing.

## [0.3.1] - 2026-06-09

Security patch for the gateway's local-run path, plus dependency hygiene. Deployed from `master` (Docker); this tag is deploy provenance. The published npm packages (`@opentriologue/mcp`, `@opentriologue/client`) are unchanged and not re-released.

### Security

- **Stopped tracking the stale committed gateway `dist` bundle** (PR #56, finding #40). The checked-in `packages/gateway/dist` predated the auth/CORS hardening in `src`: it registered wildcard CORS, had no `requireAuth` on any route, and emitted `Access-Control-Allow-Origin: *` on the SSE stream, and a non-Docker `npm start` ran that stale artifact directly via `node dist/index.js`. The bundle is now untracked (`git rm --cached`), `dist/` is gitignored, and a `prestart` `tsc` step rebuilds the hardened source before a non-Docker start. Docker production was unaffected (the Dockerfile already rebuilds from source).

### Changed

- **Dependency hygiene** (dev / lockfile, no change to the deployed runtime): hono advanced to `4.12.23` via lockfile resolution for 4 MEDIUM CVEs (PR #55, transitive, not a direct dependency), vitest bumped to `^4.1.8` in the `mcp` package devDependencies (CVE-2026-47429, PR #54), and stale planforge / scaffoldkit bootstrap artifacts removed (PR #53).

## [0.3.0] - 2026-05-25

**Headline: Closed the public-DELETE hole on the prod gateway. `https://ops.opentriologue.ai/gateway/*` now requires `Authorization: Bearer <GATEWAY_TOKEN>` on every mutating route, and the CORS allowlist replaces `origin: '*'`. Plus three months of accumulated dependency hardening and the open-source surface.**

### Added

#### Gateway auth (`packages/gateway`, @agent-ops/gateway 0.2.0)

- **Bearer-token authentication** (#48). New `packages/gateway/src/auth/` module:
  - `auth.ts`: Fastify `preHandler` reads `GATEWAY_TOKEN` env. Constant-time comparison via `timingSafeEqual` (length-prechecked). Missing token loud-fails the route with **HTTP 503** so deployments without secrets fail noisily instead of silently allowing everything. Wrong or missing `Authorization: Bearer <token>` returns 401.
  - `cors.ts`: comma-separated `GATEWAY_ALLOWED_ORIGINS` allowlist replaces `origin: '*'`. Defaults: `http://localhost:3000` (dev), `https://ops.opentriologue.ai` (prod).
  - 47 unit tests across the gateway suite, including malformed-header, blank-env, and case-insensitive `Bearer` parsing.
- **Auth applied to every mutating route**: `POST /agents/register`, `POST /agents/:id/heartbeat`, `DELETE /agents/:id`, `POST /agents/:id/command`, all `/api/state/*` writes, the top-level `/events` SSE, and `/api/events*`. `/health` deliberately stays public for Traefik/Docker liveness probes.

#### Client SDK + CLI (`packages/client`, @opentriologue/client 0.2.0)

- `AgentOpsClient` constructor accepts an optional `{ token }` option that attaches `Authorization: Bearer` to every request. Backwards-compatible (additive).
- `loadConfig()` reads `AGENT_OPS_GATEWAY_TOKEN` from env into the new `gatewayToken` field.
- `agent-ops register/heartbeat/status` thread the token through every `new AgentOpsClient(...)` automatically.
- `agent-ops config` now prints whether the gateway token is set (without revealing the value).
- Error formatter `describeError()` surfaces upstream `error.response.data.error` so a 401 actually says `UNAUTHORIZED` instead of `Request failed with status code 401`.

#### MCP server (`packages/mcp`, @opentriologue/mcp 0.2.0)

- Reads `GATEWAY_TOKEN` from env into `Config.gatewayToken`; the gateway client attaches `Authorization: Bearer` only when set (no `Bearer undefined` headers).

#### Dashboard (`apps/dashboard`)

- New server-side `lib/gateway/client.ts` (`gatewayFetch` helper). Every `app/api/gateway/**/route.ts` Next proxy now forwards the token automatically.
- SSE proxy at `/api/gateway/events/stream` forwards upstream `Content-Type` on error responses so the browser sees the actual 401/503 body instead of an empty event stream.

### Changed

- **CORS**: `@fastify/cors` plugin is now configured with the `GATEWAY_ALLOWED_ORIGINS` allowlist (no more `origin: '*'`). The `/api/events/stream` route stopped echoing the duplicate `Access-Control-Allow-Origin: *` header.
- `docker-compose.yml` and `docker-compose.prod.yml` plumb `GATEWAY_TOKEN` + `GATEWAY_ALLOWED_ORIGINS` into the gateway service, and `GATEWAY_TOKEN` into the dashboard service. Prod compose now uses long-form `env_file: .env` with `required: false` so fresh-clone CI runs do not fail.
- `.env.example` + `.env.production.example` document the new variables with safe defaults.
- Root `npm test` now uses `--workspaces --if-present` so workspaces without a `test` script no longer fail the suite.

### Security

- **axios `^1.15.2`** (#41) + **`ip-address` override `^10.1.1`**: clears 15 Dependabot alerts (4 HIGH, 10 MEDIUM, 1 LOW).
- **`apps/dashboard` next `^16.2.6`** (#43) + scoped postcss override (#44): closes 13 CVEs.
- **postcss `^8.5.14`** (#40) + root postcss override (#42): clears MEDIUM Dependabot alert #35 and its regression.
- **qs `6.15.2`** (#45): CVE-2026-8723.
- Gateway no longer accepts unauthenticated `DELETE /agents/:id` from the public internet (the original motivation for this release).

### Fixed

- `@modelcontextprotocol/sdk` pinned to `~1.29.0` (#47): resolves TS2589 `Type instantiation is excessively deep` blocking the MCP build.
- `apps/dashboard` integration + contract tests short-circuit when `localhost:3000` is unreachable, so `npm test` is now green from a fresh clone (was failing on master with `ECONNREFUSED`).
- Deleted dead `apps/dashboard/lib/agents/gateway-sse.ts` (zero callers, would have broken under the new auth gate because browser `EventSource` cannot set headers).
- `docker-compose.yml` default `GITHUB_REPOS` list replaced dead `git-batch-cli` reference with `agent-dx` (#38).

### Build / CI

- `@opentriologue/client` is now publishable; the MCP publish workflow runs in the right build order so `@opentriologue/client` builds before `@opentriologue/mcp` consumes it (#37).
- `packages/mcp` build runs with `NODE_OPTIONS=--max-old-space-size=8192` and an incremental tsc cache (#46).

### Documentation

- Open-source surface added (#39): LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, plus GitHub issue + PR templates.

### Verification

- `npm test`: gateway 47 + mcp 35 + dashboard 28 = 110 tests green.
- Preflight: `ready: true`, confidence 0.74.
- Live dogfood against `https://ops.opentriologue.ai/gateway/*` proved every probe:
  - `GET /health` without token: **200** (public, as designed).
  - `GET /agents` / `POST /agents/register` / `DELETE /agents/:id` / `GET /api/events` without token: **401 UNAUTHORIZED**.
  - Same routes with token: **200**.
  - Wrong token: **401**. Lowercase `bearer`: **200** (case-insensitive header).
  - Dashboard proxy at `https://ops.opentriologue.ai/api/gateway/agents`: **200** with 3 agents (token threaded server-side).
  - CORS allowlist probed with `Origin: https://ops.opentriologue.ai` (allowed): response carries `access-control-allow-origin: https://ops.opentriologue.ai`. With `Origin: https://evil.example` (disallowed): the response carries no `access-control-allow-origin` header, so the browser blocks the read.

### Upgrade notes

- **Set `GATEWAY_TOKEN`** in your gateway's `.env` before deploying this release. Without it every authenticated route returns 503 by design (per the no-silent-errors policy). Generate a value with `openssl rand -hex 32`.
- External agents using `@opentriologue/client` should pass `{ token: process.env.AGENT_OPS_GATEWAY_TOKEN }` to `new AgentOpsClient(...)`, or set `AGENT_OPS_GATEWAY_TOKEN` so the bundled CLI picks it up automatically.
- The same token value is read on the gateway side (`GATEWAY_TOKEN`) and on the client side (`AGENT_OPS_GATEWAY_TOKEN` / `GATEWAY_TOKEN` for MCP). Pick one secret, set it everywhere it's consumed.

## [0.2.0] - 2026-05-01

**Headline: Absorbed the former `LanNguyenSi/ops-mcp` standalone repo as `packages/mcp`, established the npm publish flow for `@opentriologue/mcp`, and killed type drift between the MCP wrapper and the gateway client.**

### Added

#### MCP server (`packages/mcp`, `@opentriologue/mcp`)

- **Imported as workspace** (#33). Source byte-identical to `LanNguyenSi/ops-mcp@master`. Mirrors the existing `packages/gateway` and `packages/client` layout: own `package.json`, `tsconfig.json`, `vitest.config.ts`. Package name unchanged (`@opentriologue/mcp`), `publishConfig.access: public` preserved. The standalone GitHub repo can now be archived.
- **Manual publish workflow** (#34). `.github/workflows/publish-mcp.yml`, `workflow_dispatch` only, with a `dry-run` boolean input that runs `npm publish --dry-run` against npm without uploading. The real publish step uses `NODE_AUTH_TOKEN: secrets.NPM_TOKEN`. Permissions: `contents: read`.

#### Client (`packages/client`, `@opentriologue/client`)

- **State-store types** mirror `packages/gateway/src/state/state.schema.ts`: `StateEntry`, `StateKeyInfo`, `StateListResult`, `CasConflictError`. The client SDK now describes the full agent-ops surface (registry + state) at the type level.

### Changed

- **Type drift killed** (#35). `packages/mcp/src/types.ts` becomes a re-export shim: `Agent`, `AgentStatus`, `RegisterPayload`, `HeartbeatPayload`, plus the new state-store types are pulled from `@opentriologue/client`. `RegisterAgentInput` is an alias for `RegisterPayload`. `RegisterAgentResult` becomes `Pick<Agent, "id" | "name" | "status" | "registeredAt">`. `Agent.lastSeen` tightened from `string | null` to `string` (verified against `packages/gateway/src/registry.ts`, which never returns null), `tags` from optional to required, `status` to the strict `AgentStatus` union.
- `packages/mcp` adds `@opentriologue/client` as a workspace dependency. Build order: client builds before mcp.
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
    ├── client/               # @opentriologue/client CLI + SDK
    └── mcp/                  # @opentriologue/mcp, MCP server for AI agents (new)
```

### Verification

- `npm run build` (all four workspaces): green; client builds before mcp via the new dependency.
- `npm test`: 67 tests pass (gateway 32, mcp 35).
- `npm publish --workspace=@opentriologue/mcp --dry-run`: 10.0 kB tarball, 30 files.

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
