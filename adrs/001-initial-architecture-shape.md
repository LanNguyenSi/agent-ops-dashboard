# ADR-001: Initial Architecture Shape

## Context

Project: agent-ops-dashboard

Summary: Operational dashboard for monitoring AI agents, deployments, CI/CD pipeline health, and GitHub repository status. Provides a real-time overview for teams running multiple AI agents across multiple repositories.

## Decision

Start with modular monolith as the default architecture.

## Consequences

### Positive

- Faster alignment on a high-leverage decision.
- Better reviewability for future changes.

### Negative

- This decision may need revision as requirements sharpen.

### Follow-Up

- Validate this ADR during the first implementation wave.
- Update if significant scope or risk assumptions change.
