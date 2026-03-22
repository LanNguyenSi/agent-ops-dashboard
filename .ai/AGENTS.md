# AGENTS

## Roles

- Planning lead: maintains the plan, validates architecture assumptions, and reruns planning when inputs materially change.
- Architecture reviewer: challenges module boundaries, scaling assumptions, and integration risks before implementation expands.
- Implementation lead: executes one reviewable task at a time and updates tests and docs with each change.
- Human owner: remains accountable for review, release, and acceptance of agent-generated work.


## Workflow

1. Read `.ai/ARCHITECTURE.md`, `.ai/TASKS.md`, and the current prompt export before changing code.
2. Follow the applicable playbooks listed below for workflow, testing, documentation, and governance expectations.
3. Keep diffs small, update tests with the change, and avoid bundling unrelated work.
4. Escalate blockers or scope changes instead of silently improvising around them.

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

## Change Rules

- Preserve backward compatibility unless a breaking change is explicitly accepted.
- Update docs and ADRs when architectural assumptions shift.
- Treat prompts and generated artifacts as review inputs, not as permission to skip engineering judgment.

## Project Context

- Project: agent-ops-dashboard
- Planner profile: product
- Phase: phase_1
- Path: core
