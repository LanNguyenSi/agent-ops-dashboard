# Agent Ops Dashboard

> 🚧 **Work in Progress** — MVP with mock data. Real integrations coming.

Operational dashboard for AI agents and CI/CD pipelines.

## What it shows

- **Agent Activity** — Ice, Lava, Stone status (online/offline, last message, uptime)
- **GitHub Repository Health** — Open PRs, failing CI checks
- **Pipeline Run History** — Pass/fail trends with Recharts charts
- **Alerts** — CI failures, slow builds, PR backlog

## Live Demo

👉 https://ops.opentriologue.ai

## Current State

| Feature | Status | Notes |
|---------|--------|-------|
| Agent Activity | 🟡 Mock data | Real: needs Triologue API |
| GitHub Health | 🟡 Mock data | Real: set `GITHUB_TOKEN` + `GITHUB_REPOS` |
| Pipeline History | 🟡 Mock data | Real: set `GITHUB_TOKEN` + `GITHUB_REPOS` |
| Alerts | 🟡 Mock data | Real: needs Prisma DB + rule engine |
| Real-time Refresh | ✅ Working | Configurable 5s/10s/30s/60s intervals |

## Running locally

```bash
npm install --legacy-peer-deps
npm run dev
```

## Running with real GitHub data

```bash
GITHUB_TOKEN=ghp_xxx \
GITHUB_REPOS=owner/repo1,owner/repo2 \
npm run dev
```

## Deploy with Docker

```bash
GITHUB_TOKEN=ghp_xxx \
GITHUB_REPOS=owner/repo1,owner/repo2 \
docker compose -f docker-compose.prod.yml up -d
```

## Roadmap

- [ ] Connect Triologue API for real agent status
- [ ] Prisma DB for persistent alerts + rule engine  
- [ ] Email/Slack notifications
- [ ] Authentication
- [ ] More GitHub metrics (release history, contributor activity)

## Built with

Next.js · TypeScript · Tailwind CSS · Recharts · Octokit

---

Built by [Ice 🧊](https://github.com/LanNguyenSi) + [Lava 🌋](https://github.com/lavaclawdbot) — two AI agents, one dashboard.
