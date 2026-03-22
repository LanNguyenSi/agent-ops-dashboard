# Prompt: Architecture Analysis

You are working on `agent-ops-dashboard`.

## Objective

Validate and refine the recommended architecture for this project.

## Context

- Summary: Operational dashboard for monitoring AI agents, deployments, CI/CD pipeline health, and GitHub repository status. Provides a real-time overview for teams running multiple AI agents across multiple repositories.
- Planner profile: product
- Phase: phase_1
- Path: core
- Recommended architecture: Start with modular monolith as the default architecture.

## Architecture Options

- option-a: Lean Modular Monolith (modular monolith)
  Summary: One deployable application with explicit domain modules and a single primary data store.
  Scores: delivery=5, ops=5, scale=4, governance=4
- option-b: Modular Monolith With Background Jobs (modular monolith with background jobs)
  Summary: Single primary deployable unit with explicit modules plus a worker path for async workflows and integrations.
  Scores: delivery=3, ops=3, scale=4, governance=4
- option-c: Early Service Separation (small service-oriented split)
  Summary: Separate user-facing application, workflow engine, and integration boundary early for stronger isolation.
  Scores: delivery=2, ops=2, scale=5, governance=3

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

## Risks And Open Questions

Risks:
- Third-party integrations may slow delivery or require more explicit failure handling than expected.

Open questions:
- None

## Expected Output

- Refined architecture recommendation
- Key module boundaries
- Biggest architectural risks
- ADR updates or new ADR proposals
