# Task 012: Mock → Real Data Integration

## Priority
P0

## Goal
Replace all mock data in agent-ops-dashboard with real data sources.

## Current State
All 3 data sources use mock data:
- **Agents** (lib/agents/client.ts) — mock Ice/Lava/Stone, needs Triologue API
- **Pipeline** (lib/pipeline/service.ts) — falls back to mock when `GITHUB_REPOS` not set
- **Alerts** (lib/alerts/service.ts) — pure mock, no real source yet

## What Needs to Change

### 1. Pipeline — GitHub Actions (easiest, most impactful)

`lib/pipeline/service.ts` already has real GitHub API code — just needs `GITHUB_TOKEN` and `GITHUB_REPOS` env vars set on the server.

**Action:** Set env vars in docker-compose.prod.yml (or .env on Stone's VPS):
```env
GITHUB_TOKEN=ghp_xxx
GITHUB_REPOS=LanNguyenSi/telerithm,LanNguyenSi/agent-ops-dashboard,LanNguyenSi/triologue
```

**No code change needed for pipeline!**

### 2. Agent Status — Triologue API

`lib/agents/client.ts` has a commented-out real API call to `http://localhost:9500/health`.

**Problem:** agent-ops-dashboard runs on Stone's VPS, Triologue runs on Ice's VPS.
Needs either:
- A) Public endpoint for Triologue `/health` (via Traefik)
- B) Internal network call if both are on same host

**Action:**
- Expose `GET /api/health` or `/api/agents` via opentriologue.ai (already has Traefik)
- Update `lib/agents/client.ts` to call `https://opentriologue.ai/api/health`
- Parse `connectedAgents` + map to `AgentActivity` format

**Triologue health response:**
```json
{ "status": "ok", "connectedAgents": 2, "agents": [...] }
```

### 3. Alerts — Derived from Pipeline

Real alerts can be derived from pipeline failures:
- `conclusion === "failure"` → generate critical alert
- Keep existing mock for PR backlog + slow builds (no real source yet)

**Action:** In `lib/alerts/service.ts`, call `getPipelineRuns()` and generate alerts from failures.

## Files to Modify

- `lib/agents/client.ts` — uncomment real API, point to opentriologue.ai
- `lib/alerts/service.ts` — derive alerts from real pipeline data
- `docker-compose.prod.yml` — add GITHUB_TOKEN + GITHUB_REPOS env vars
- `app/page.tsx` — add error states for when real APIs fail

## Acceptance Criteria

- [ ] Pipeline shows real GitHub Actions runs from configured repos
- [ ] Agent status shows real connected agents from Triologue
- [ ] Alerts include at least pipeline failure alerts derived from real data
- [ ] Graceful fallback to mock when APIs are unavailable
- [ ] All existing tests still pass

## Notes

- GITHUB_TOKEN will be provided by Lan separately (do NOT hardcode)
- Triologue endpoint: https://opentriologue.ai (already has SSL)
- ops.opentriologue.ai (Stone's VPS) → opentriologue.ai (Ice's VPS) = cross-server call
