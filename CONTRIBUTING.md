# Contributing to agent-ops-dashboard

Thanks for your interest. agent-ops-dashboard is the operational dashboard for monitoring AI agents, deployments, and pipeline health. Live: [ops.opentriologue.ai](https://ops.opentriologue.ai).

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
   ```

4. For dashboard UI changes, run `apps/dashboard` locally and verify the affected widget visually before submitting.
5. Open the PR with a clear summary, motivation, and test plan.

## Dev Setup

```bash
git clone https://github.com/LanNguyenSi/agent-ops-dashboard
cd agent-ops-dashboard
npm install
npm run build
```

For local stack: `docker-compose -f docker-compose.dev.yml up`.

## Style

Match the surrounding code. Prefer small, reviewable diffs.
