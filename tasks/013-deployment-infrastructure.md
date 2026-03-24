# Task 013: Deployment Infrastructure

## Priority
P1

## Goal
Make ops.opentriologue.ai production-grade: proper deployment workflow, health checks, and monitoring.

## Problems

1. **No make deploy** — currently manual docker compose commands on Stone's VPS
2. **No .env.production in git** — GITHUB_TOKEN set manually, not reproducible
3. **No health check endpoint** — no way to verify deployment succeeded
4. **No CI/CD** — changes require manual SSH deploy

## Files to Create or Modify

- `Makefile` — add `deploy`, `deploy-backend`, `logs` targets (same pattern as telerithm)
- `.env.production.example` — document required env vars (no secrets)
- `app/api/health/route.ts` — simple health check endpoint
- `.github/workflows/ci.yml` — lint + typecheck on push

## Acceptance Criteria

- [ ] `make deploy` works on Stone's VPS
- [ ] `.env.production.example` documents all required vars
- [ ] `GET /api/health` returns `{ status: "ok", version: "..." }`
- [ ] GitHub Actions CI runs on every PR (lint + typecheck)

## Notes

- Makefile pattern: see telerithm/Makefile for reference
- GITHUB_TOKEN must NOT be in git — document in .env.production.example only
