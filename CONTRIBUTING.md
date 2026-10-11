# Contributing to agent-ops-dashboard

Thanks for your interest. agent-ops-dashboard is the operational dashboard for AI agents: agent registry, shared state store, activity feed, and GitHub repo health. Live: [ops.opentriologue.ai](https://ops.opentriologue.ai).

## Issues

- Bug reports: include repro steps, expected vs. actual, the affected app/package (`apps/dashboard`, `packages/client`, `packages/gateway`, `packages/mcp`).
- Feature requests: describe the use case before the proposed shape.

## Pull Requests

1. Fork, branch off `master` (e.g. `feat/<scope>`, `fix/<scope>`).
2. Keep changes scoped where possible.
3. Run the local checks for the affected workspace:

   ```bash
   npm install
   npm run build
   npm test
   make lint   # lint and type-check, the same steps as CI
   ```

4. For dashboard UI changes, run `apps/dashboard` locally (see the dev loop in the [README quick start](README.md#quick-start)) and verify the affected widget visually before submitting.
5. Open the PR with a clear summary, motivation, and test plan.

## Dev Setup

```bash
git clone https://github.com/LanNguyenSi/agent-ops-dashboard
cd agent-ops-dashboard
npm install
npm run build
```

For the full local stack (PostgreSQL, gateway, dashboard) run `docker compose up -d` with the default `docker-compose.yml` (see the [README quick start](README.md#quick-start)). `docker-compose.dev.yml` is only useful for a local Postgres: `docker compose -f docker-compose.dev.yml up db`.

## Style

Match the surrounding code. Prefer small, reviewable diffs.
