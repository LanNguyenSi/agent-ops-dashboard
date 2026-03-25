# Task 020: Add CI + Tests to Repos Without Them

## Goal
Add GitHub Actions CI pipeline and basic tests to repos that currently have none.
Docs/manifesto repos are excluded (no code to test).

## Repos Needing CI + Tests

| Repo | Language | Priority | Notes |
|------|----------|----------|-------|
| `frost-core` | TypeScript | P1 | Core library, most critical |
| `frost-dashboard` | TypeScript | P1 | React dashboard |
| `github-api-tool` | TypeScript | P1 | CLI tool with commands |
| `memory-weaver` | TypeScript | P1 | Core memory system |
| `memory-weaver-cloud` | TypeScript | P1 | Deployed on Stone |
| `plagiarism-coach` | TypeScript | P2 | |
| `allergen-guard` | TypeScript | P2 | |
| `mw-cli` | JavaScript | P2 | |
| `mywebsite` | TypeScript | P2 | |
| `telerithm-playground` | TypeScript | P2 | |
| `telerithm-landingpage` | HTML | P3 | Minimal — only lint/validate |
| `openclaw-skill-memory-weaver` | Shell | P3 | Minimal — shellcheck |

## CI Template (TypeScript/Node)

```yaml
name: CI
on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --legacy-peer-deps
      - run: npm run type-check  # if tsconfig exists
      - run: npm test           # if test script exists
      - run: npm run build      # if build script exists
```

## Minimum Test Requirements per Repo

- **frost-core:** Unit tests for scoring engine (5 analyzers)
- **github-api-tool:** CLI command tests (list-issues, list-prs)
- **memory-weaver/cloud:** API endpoint tests (health, basic CRUD)
- **frost-dashboard:** Component render tests
- **Others:** At minimum 1 smoke test + type check

## Workflow
1. Add vitest (or jest) if not present
2. Write minimum tests
3. Add `.github/workflows/ci.yml`
4. Verify pipeline goes green

## Priority
P2 — important for long-term quality but not blocking

## Estimated effort
~30min per repo for CI only, 1-2h per repo for tests
