# Architecture — Agent Ops Dashboard

## Overview

Full-stack Next.js application with App Router.

## Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| Pages | `app/` | Route handlers (Server Components) |
| API | `app/api/` | REST endpoints |
| Components | `components/` | Reusable UI |
| Library | `lib/` | Business logic, auth, utilities |
| Database | `prisma/` | Schema, migrations |

## Data Flow

```
Browser → Next.js Server Component → Prisma → Sqlite
Browser → API Route → Prisma → Sqlite
```

## Key Decisions

See `.ai/DECISIONS.md` for architecture decision records.
