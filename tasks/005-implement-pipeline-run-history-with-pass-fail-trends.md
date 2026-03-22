# Task 005: Implement Pipeline run history with pass/fail trends

## Category

feature

## Priority

P1

## Wave

wave-3

## Delivery Phase

implementation

## Depends On

- 001
- 002

## Blocks

- 008

## Summary

Design and implement the capability for: Pipeline run history with pass/fail trends.

## Problem

The product cannot satisfy its initial scope until Pipeline run history with pass/fail trends exists as a reviewable, testable capability.

## Solution

Add a focused module for Pipeline run history with pass/fail trends that matches the recommended modular monolith and keeps integration boundaries explicit.

## Files To Create Or Modify

- lib/pipeline/types.ts — Pipeline run types (Run, Status, Trend)
- lib/pipeline/service.ts — Pipeline history service
- lib/pipeline/analytics.ts — Pass/fail trend calculations
- lib/pipeline/filters.ts — Filter pipelines by status, date, repo
- app/api/pipeline/runs/route.ts — GET pipeline runs with filters
- app/api/pipeline/stats/route.ts — GET pipeline statistics
- app/api/pipeline/trends/route.ts — GET pass/fail trends over time
- components/PipelineChart.tsx — Trend chart component (Recharts)
- components/PipelineList.tsx — Pipeline run list
- components/PipelineCard.tsx — Single pipeline run card
- components/StatusBadge.tsx — Pipeline status indicator
- tests/pipeline/analytics.test.ts — Trend calculation tests
- tests/pipeline/filters.test.ts — Filter logic tests

## Acceptance Criteria

- [ ] The Pipeline run history with pass/fail trends capability is available through the intended application surface.
- [ ] Core validation, error handling, and persistence for Pipeline run history with pass/fail trends are covered by tests.

## Implementation Notes

- Start from domain rules and access constraints before UI or transport details.
- Keep module boundaries explicit so later extraction remains possible if the system grows.
- Update docs and tests in the same change instead of leaving them for cleanup.
