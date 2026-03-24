# Task 016: GitHub Repos API — Filter, Sort, Pagination + Cache

## Goal
Upgrade `/api/github/repos` to support all repos (not just last 10) with filtering, sorting, and server-side caching. Useful for both dashboard and agent queries.

## Query Parameters

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `limit` | 1-100 / `all` | `10` | Number of repos |
| `sort` | `updated` \| `stars` \| `name` \| `ci_status` | `updated` | Sort order |
| `order` | `asc` \| `desc` | `desc` | Sort direction |
| `filter` | `all` \| `failing` \| `open_prs` | `all` | Pre-defined filters |
| `language` | e.g. `TypeScript` | — | Filter by language |

## Examples

```bash
# All failing repos
GET /api/github/repos?filter=failing

# Top 20 by stars
GET /api/github/repos?sort=stars&limit=20

# All TypeScript repos
GET /api/github/repos?language=TypeScript&limit=all

# Agent check: any open PRs?
GET /api/github/repos?filter=open_prs&limit=all
```

## Implementation Notes

### Rate Limit Problem
Each repo requires ~3-4 API calls (repo info, PRs, CI runs, checks).
- 50 repos × 4 calls = 200 API calls per request
- GitHub token limit: 5000/hour → fine, but needs caching

### Server-side Cache
- Cache all repo health data for 5 minutes (in-memory Map or `unstable_cache`)
- Background refresh on first request after TTL expires
- Cache key: `github-repos-{owner}`

### Pagination Strategy
1. Fetch all repos via `listForUser` (paginated, 100 per page)
2. Run `getRepoHealth` in batches of 10 (avoid rate limit spikes)
3. Cache the full result, apply filters/sort in-memory

## Files to Change
- `apps/dashboard/app/api/github/repos/route.ts` — add query param handling
- `apps/dashboard/lib/github/repos.ts` — add `getAllRepos()` with caching
- `apps/dashboard/lib/github/cache.ts` — new: simple TTL cache

## Priority
P2 — useful but not blocking

## Estimated effort
~2-3h
