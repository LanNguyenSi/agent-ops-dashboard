# Task 014: Alert Rules Engine

## Priority
P1

## Goal
Replace hardcoded alert generation with a configurable rules engine.

## Current State
Alerts are derived from pipeline failures only (`lib/alerts/service.ts`). No way to configure rules, thresholds, or notification channels.

## Solution

### Alert Rules
Define rules in `lib/alerts/rules.ts`:
```ts
interface AlertRule {
  id: string;
  name: string;
  condition: "pipeline_failure" | "high_failure_rate" | "agent_offline" | "slow_builds";
  threshold?: number;       // e.g., failure rate > 50%
  repos?: string[];         // apply only to specific repos
  severity: "critical" | "warning" | "info";
  enabled: boolean;
}
```

### Default Rules
- Pipeline failure → Critical alert
- Failure rate > 50% in last 7 days → Warning
- Agent offline > 30 min → Critical
- Build duration > 10 min avg → Warning

## Files to Create or Modify

- `lib/alerts/rules.ts` — rule definitions + evaluation engine
- `lib/alerts/service.ts` — refactor to use rules engine
- `app/api/alerts/route.ts` — already exists, extend with rule management
- `components/AlertList.tsx` — show which rule triggered each alert

## Acceptance Criteria

- [ ] Default rules generate alerts from real data
- [ ] Rules are configurable (enable/disable, threshold)
- [ ] Alert card shows which rule triggered it
- [ ] Tests cover rule evaluation logic
