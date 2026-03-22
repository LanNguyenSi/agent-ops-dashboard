# AI Context: Agent Ops Dashboard

> This file provides context for AI coding agents working on this project.
> For detailed agent configuration, see `.ai/` directory.

## Project Overview

**Agent Ops Dashboard** — Monitor AI agents, CI pipelines and GitHub health

- **Stack:** Next.js + Prisma + Sqlite + Tailwind CSS 4
- **Auth:** NONE
- **Language:** EN
- **Deployment:** Docker + Traefik
## Agent Context Files

| File | Purpose |
|------|---------|
| `.ai/AGENTS.md` | Team roles, workflow, code standards |
| `.ai/ARCHITECTURE.md` | System structure, patterns, deployment |
| `.ai/TASKS.md` | Work packages with priorities |
| `.ai/DECISIONS.md` | Why things are built this way |

## Quick Rules

1. **Server Components by default** — add `'use client'` only when needed
2. **`force-dynamic`** on all pages with DB queries
3. **Transactions** for DB mutations affecting related data
4. **EN** for UI strings, English for code/comments
5. **Feature branches** — `feat/<task-id>-<name>`, PR to main
6. **No `any` types** — TypeScript strict mode
7. **Docker builds** — `prisma generate` in both deps AND builder stages