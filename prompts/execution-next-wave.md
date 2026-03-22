# Prompt: Delivery Execution

You are working on `agent-ops-dashboard`.

## Objective

Turn the current plan into an implementation strategy for the next delivery wave.

## Context

- Planner profile: product
- Phase: phase_1
- Current wave: wave-1
- Wave goal: Lock scope, assumptions, and engineering baseline.
- Critical path: 001 -> 002 -> 003 -> 008

## Tasks In Scope

- 001 Write project charter and architecture baseline (P0)
  Depends on: none
- 002 Set up repository and delivery baseline (P0)
  Depends on: 001

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

## Constraints And Questions

Constraints:
- GitHub API rate limits (5000 req/hour authenticated)
- Must work with GitHub token (no OAuth required)
- No database required — stateless, API-driven
- Deployable as single Docker container

Open questions:
- None

## Expected Output

- proposed execution order inside the wave
- risks or blockers
- test and verification approach
- whether any task should be split further
