# Configuration

Both the gateway and the dashboard read configuration from environment variables. Docker Compose reads the repo-root `.env`. The Next.js dev server (`npm run dev`) reads env files from `apps/dashboard/` (for example `apps/dashboard/.env.local`), not the repo root. The gateway process itself has no dotenv loader, so when you run it directly (`npm run dev:gateway`) export `GATEWAY_TOKEN` in the shell, and `DATABASE_URL` if you want the state store and persistent event log. Production deployments use the values configured for the `docker-compose.prod.yml` services.

## Environment variables

### Gateway (`packages/gateway`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `DATABASE_URL` | (none) | PostgreSQL connection string. If unset, the gateway runs in memory-only mode (registry + in-memory SSE only); state store and persistent event log are disabled. |
| `REGISTRY_FILE` | `agent-registry.json` (cwd) | Path to the JSON file the in-memory registry persists to. In Docker this is set to `/data/agent-registry.json` and backed by the `gateway_data` volume. |
| `GATEWAY_TOKEN` | (none) | Bearer token required on authenticated endpoints. When unset, the gateway logs a warning at startup and authenticated routes respond `503`. For `docker-compose.prod.yml`, set it in the `.env` file next to the compose file (both services load that file, and Compose substitutes it into both services) or export it in the shell that runs `docker compose`. The dashboard needs the same value so its server-side calls authenticate. |
| `GATEWAY_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed CORS origins for browser clients. In compose, defaults to `http://localhost:3000`; in production, set to the dashboard's public origin (e.g. `https://ops.opentriologue.ai`). |

### Dashboard (`apps/dashboard`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `GATEWAY_INTERNAL_URL` | `http://agent-ops-gateway:3001` | Server-side gateway URL used by Next.js API routes |
| `GATEWAY_TOKEN` | (none) | Bearer token the dashboard attaches to its server-side gateway calls. Must match the gateway's `GATEWAY_TOKEN`, otherwise the `/api/gateway/*` proxies get `401`/`503`. |
| `GITHUB_TOKEN` | (required for repo health) | GitHub personal access token; see [GitHub token](#github-token) for the access it needs |
| `GITHUB_OWNER` | (none; `docker-compose.yml` sets `LanNguyenSi`) | Default GitHub user/org for the repo-health dashboard. When unset, the owner of `GITHUB_REPOS` is used when all entries share one, else `LanNguyenSi` |
| `GITHUB_REPOS` | (none; the compose files set a default list) | Comma-separated `owner/repo` pairs; entries without an owner are ignored. Used by pipeline monitoring, `/api/github/checks`, `/api/github/prs` and alerts; when all entries share one owner it also sets the default owner for repo health |

### Compose-level

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | `postgres` (dev) | PostgreSQL password used by the `postgres` service and embedded in the gateway's `DATABASE_URL` |

## GitHub token

The dashboard's repo-health and pipeline monitoring features need a GitHub PAT. The dashboard only reads from GitHub: repository metadata, pull requests, Actions workflow runs, check runs and Dependabot alerts.

1. Generate a token at <https://github.com/settings/tokens>.
2. Classic token: `repo` (or `public_repo` for public repositories only), plus `security_events` for Dependabot counts. Fine-grained token: read-only access to these resources for the tracked repositories.
3. Set it as `GITHUB_TOKEN` in `.env` (start from `.env.production.example`) or export it in the shell that runs Docker Compose.

Without `GITHUB_TOKEN` the gateway and agent registry still work, but the repo-health endpoints (`/api/github/repos`, `/api/github/repos/{owner}/{repo}`) return `500` with `GITHUB_TOKEN environment variable is not set`. With `GITHUB_REPOS` set, the pipeline endpoints also return `500`, and `/api/github/checks` and `/api/github/prs` return empty lists. With `GITHUB_REPOS` unset, the pipeline and alert endpoints return built-in sample data, and `/api/github/checks` and `/api/github/prs` return `500`.

## Local development

Two `.env.example` files ship in the repo:

- `.env.example`: the minimal set for local development (`GITHUB_TOKEN`, `GITHUB_REPOS`, `GATEWAY_TOKEN`, and `GATEWAY_ALLOWED_ORIGINS`).
- `.env.production.example`: the full production set, including `NODE_ENV` and the gateway auth settings (`GATEWAY_TOKEN`, `GATEWAY_ALLOWED_ORIGINS`).

Copy whichever you need to `.env` and fill in real values:

```bash
cp .env.example .env
# edit .env, set GITHUB_TOKEN
```

For the non-Docker loop, put the dashboard values (`GITHUB_TOKEN`, `GITHUB_REPOS`, `GATEWAY_TOKEN`, `GATEWAY_INTERNAL_URL=http://localhost:3001`) in `apps/dashboard/.env.local` (gitignored) or export them in the shell.

For state-store and persistent activity-feed features locally, point `DATABASE_URL` at a Postgres instance. The simplest path is `docker compose -f docker-compose.dev.yml up db` (Postgres only) and then run the gateway directly:

```bash
DATABASE_URL=postgresql://dev:dev@localhost:5432/app_dev npm run dev:gateway
```

## Deployment

Production uses `docker-compose.prod.yml` with two services (gateway, dashboard) and a Traefik label set that exposes the dashboard on `ops.opentriologue.ai` with Let's Encrypt TLS. It has no Postgres service and sets no `DATABASE_URL`, so the gateway runs in memory-only mode (state store and persistent event log disabled) unless you supply `DATABASE_URL` yourself, for example in `.env`. For the Postgres-backed setup use the default `docker-compose.yml`.

The Makefile wraps the common deploy commands:

```bash
make deploy              # docker compose -f docker-compose.prod.yml up -d --build
make deploy-pull         # git pull origin master && deploy
make logs                # tail production logs
make health              # curl localhost:3000/api/health (default compose or dev loop; needs jq)
```

`docker-compose.prod.yml` publishes no dashboard port, so `make health` does not reach the dashboard on a prod host. There, check the gateway with `curl -s http://127.0.0.1:3001/health`, or the dashboard from inside its container with `docker compose -f docker-compose.prod.yml exec app node -e "fetch('http://127.0.0.1:3000/api/health').then(r => r.text()).then(console.log)"`.

Notes:

- When `DATABASE_URL` is set, the gateway runs database migrations automatically on startup via `runMigrations()`. There is no separate migration step.
- The `gateway_data` named volume holds `agent-registry.json` so the agent list survives gateway restarts; agents are reloaded as `offline` and must heartbeat to come back online.
- The `traefik` external network must already exist on the host before `docker compose up`.
- The dashboard container reaches the gateway server-side via `GATEWAY_INTERNAL_URL` (default `http://agent-ops-gateway:3001`, the gateway's `container_name`) and authenticates with `GATEWAY_TOKEN`. Browser clients use the dashboard's own `/api/gateway/*` proxies, so no public gateway URL needs to reach the browser.

## Troubleshooting

- `503 GATEWAY_TOKEN_NOT_CONFIGURED` from the gateway: the gateway process has no `GATEWAY_TOKEN`.
- `401 UNAUTHORIZED` from the gateway: the Bearer token is missing or does not match the gateway's `GATEWAY_TOKEN`.
- `/api/state/*` or `/api/events*` return `404` while `DATABASE_URL` is set: the database connection or a migration failed at startup (log line `[db] Failed to initialize DB features`), so the gateway registered neither the state nor the event routes. The registry keeps working. Fix the database and restart the gateway; it does not retry.
- The dashboard's `/api/gateway/agents` proxies (list, register, heartbeat) return `502`: `GATEWAY_INTERNAL_URL` does not reach the gateway. The list proxy also answers `502` when the gateway rejects its token; the error then reads `Gateway 401` or `Gateway 503`. While the list proxy fails, the agent bar falls back to `/api/agents`, which does not read this repo's gateway.
