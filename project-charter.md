# Project Charter: agent-ops-dashboard

## Summary

Operational dashboard for monitoring AI agents, deployments, CI/CD pipeline health, and GitHub repository status. Provides a real-time overview for teams running multiple AI agents across multiple repositories.

## Target Users

- AI developers managing multiple agent deployments
- Team leads monitoring pipeline health
- DevOps engineers tracking deployment status

## Core Features

- GitHub repository health overview (CI status, open PRs, failing checks)
- Agent deployment status tracker (Ice, Lava, Stone agents)
- Pipeline run history with pass/fail trends
- Alert system for CI failures and deployment issues
- Real-time refresh with configurable polling interval

## Constraints

- GitHub API rate limits (5000 req/hour authenticated)
- Must work with GitHub token (no OAuth required)
- No database required — stateless, API-driven
- Deployable as single Docker container

## Non-Functional Requirements

- Sub-second UI response for cached data
- Graceful degradation when GitHub API is slow
- Mobile-friendly layout

## Delivery Context

- Planner profile: product
- Intake completeness: complete
- Phase: phase_1
- Path: core
- Data sensitivity: low

## Applicable Playbooks

- /root/git/agent-planforge/playbooks/planning-and-scoping.md
- /root/git/agent-engineering-playbook/playbooks/01-project-setup.md
- /root/git/agent-engineering-playbook/playbooks/02-architecture.md
- /root/git/agent-engineering-playbook/playbooks/03-team-roles.md
- /root/git/agent-engineering-playbook/playbooks/04-design-principles.md
- /root/git/agent-engineering-playbook/playbooks/05-development-workflow.md
- /root/git/agent-engineering-playbook/playbooks/06-testing-strategy.md
- /root/git/agent-engineering-playbook/playbooks/07-quality-assurance.md
- /root/git/agent-engineering-playbook/playbooks/08-documentation.md

## Missing Information

- None

## Follow-Up Questions

- None

## Open Questions

- None
