# Configuration

Both the gateway and the dashboard read configuration from environment variables. Local development picks up `.env`; production deployments use the values configured for the `docker-compose.prod.yml` services.

## Environment variables

### Gateway (`packages/gateway`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `DATABASE_URL` | (none) | PostgreSQL connection string. If unset, the gateway runs in memory-only mode (registry + in-memory SSE only); state store and persistent event log are disabled. |
| `REGISTRY_FILE` | `agent-registry.json` (cwd) | Path to the JSON file the in-memory registry persists to. In Docker this is set to `/data/agent-registry.json` and backed by the `gateway_data` volume. |
| `GATEWAY_TOKEN` | (none) | Bearer token required on authenticated endpoints. When unset, the gateway logs a warning at startup and authenticated routes respond `503`. Set this in `.env.production` and in the deploy environment for both the `gateway` and `dashboard` services so the dashboard's server-side calls authenticate. |
| `GATEWAY_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed CORS origins for browser clients. In compose, defaults to `http://localhost:3000`; in production, set to the dashboard's public origin (e.g. `https://ops.opentriologue.ai`). |

### Dashboard (`apps/dashboard`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `GATEWAY_INTERNAL_URL` | `http://gateway:3001` (compose) | Server-side gateway URL used by Next.js API routes |
| `GATEWAY_TOKEN` | (none) | Bearer token the dashboard attaches to its server-side gateway calls. Must match the gateway's `GATEWAY_TOKEN`, otherwise the `/api/gateway/*` proxies get `401`/`503`. |
| `GITHUB_TOKEN` | (required for repo health) | GitHub Personal Access Token, scopes `repo` and `actions:read` |
| `GITHUB_OWNER` | `LanNguyenSi` | Default GitHub user/org for the repo-health dashboard |
| `GITHUB_REPOS` | (compose default list) | Comma-separated `owner/repo` pairs used by pipeline monitoring |

### Compose-level

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | `postgres` (dev) | PostgreSQL password used by the `postgres` service and embedded in the gateway's `DATABASE_URL` |

## GitHub token

The dashboard's repo-health and pipeline monitoring features need a GitHub PAT.

1. Generate a token at <https://github.com/settings/tokens>.
2. Required scopes: `repo` (read access to private repos you want to track) and `workflow` / `actions:read` (CI status). For Dependabot vulnerability counts the token also needs `security_events`.
3. Set it as `GITHUB_TOKEN` in `.env.production` (see `.env.production.example`) or pass it through Docker Compose / your deployment environment.

Without `GITHUB_TOKEN`, the gateway and agent registry still work, but the GitHub repo-health and pipeline panels in the dashboard return empty results.

## Local development

Two `.env.example` files ship in the repo:

- `.env.example`: the minimal set for local development (`GITHUB_TOKEN`, `GITHUB_REPOS`, `GATEWAY_TOKEN`, and `GATEWAY_ALLOWED_ORIGINS`).
- `.env.production.example`: the full production set, including `NODE_ENV` and the gateway auth settings (`GATEWAY_TOKEN`, `GATEWAY_ALLOWED_ORIGINS`).

Copy whichever you need to `.env` (or `.env.production`) and fill in real values:

```bash
cp .env.example .env
# edit .env, set GITHUB_TOKEN
```

For state-store and persistent activity-feed features locally, point `DATABASE_URL` at a Postgres instance. The simplest path is `docker compose -f docker-compose.dev.yml up db` (Postgres only) and then run the gateway directly:

```bash
DATABASE_URL=postgresql://dev:dev@localhost:5432/app_dev npm run dev:gateway
```

## Deployment

Production uses `docker-compose.prod.yml` with three services (postgres, gateway, dashboard) and a Traefik label set that exposes the dashboard on `ops.opentriologue.ai` with Let's Encrypt TLS.

The Makefile wraps the common deploy commands:

```bash
make deploy              # docker compose -f docker-compose.prod.yml up -d --build
make deploy-pull         # git pull origin master && deploy
make logs                # tail production logs
make health              # curl /api/health
```

Notes:

- The gateway runs database migrations automatically on startup via `runMigrations()`. There is no separate migration step.
- The `gateway_data` named volume holds `agent-registry.json` so the agent list survives gateway restarts; agents are reloaded as `offline` and must heartbeat to come back online.
- The `traefik` external network must already exist on the host before `docker compose up`.
- The dashboard container reaches the gateway server-side via `GATEWAY_INTERNAL_URL` (in compose, `http://gateway:3001`) and authenticates with `GATEWAY_TOKEN`. Browser clients use the dashboard's own `/api/gateway/*` proxies, so no public gateway URL needs to reach the browser.
