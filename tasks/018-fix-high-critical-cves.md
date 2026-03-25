# Task 018: Fix High/Critical CVEs

## Affected Packages

### next (Critical + High)
| Alert | Severity | Summary | Fix |
|-------|----------|---------|-----|
| #4, #14 | **Critical** | Next.js RCE in React flight protocol | Upgrade to >= 15.2.6 |
| #5, #8, #15, #18 | **High** | Next.js DoS via HTTP request deserialization (insecure RSC) | Upgrade to >= 15.2.9 |

**Current version:** 15.2.4
**Required version:** >= 15.2.9 (covers all next CVEs)

### fastify (High)
| Alert | Severity | Summary | Fix |
|-------|----------|---------|-----|
| #19, #23 | **High** | Content-Type tab character allows body validation bypass | Upgrade to >= 5.7.2 |

**Current version:** unknown (check packages/gateway/package.json)
**Required version:** >= 5.7.2

## Changes Required

### 1. `apps/dashboard/package.json`
```bash
npm install next@latest --workspace=apps/dashboard
```

### 2. `packages/gateway/package.json`
```bash
npm install fastify@latest --workspace=packages/gateway
```

### 3. Rebuild + redeploy
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes
- Next.js 15.2.9+ is a patch release, no breaking changes expected
- Fastify 5.7.2+ is a patch release, no breaking changes expected
- Run `npm test --workspace=apps/dashboard` after upgrade

## Priority
P0 — Critical RCE vulnerability in production

## Estimated effort
~30 minutes
