# Task 007: Implement Real-time refresh with configurable polling interval

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

Design and implement the capability for: Real-time refresh with configurable polling interval.

## Problem

The product cannot satisfy its initial scope until Real-time refresh with configurable polling interval exists as a reviewable, testable capability.

## Solution

Add a focused module for Real-time refresh with configurable polling interval that matches the recommended modular monolith and keeps integration boundaries explicit.

## Files To Create Or Modify

- lib/widgets/types.ts — Widget interfaces + Zod schemas
- lib/widgets/service.ts — CRUD operations for widgets
- app/api/widgets/route.ts — GET (list) + POST (create) endpoints
- app/api/widgets/[id]/route.ts — GET/PUT/DELETE single widget
- app/api/widgets/reorder/route.ts — POST endpoint for position updates
- app/dashboard/page.tsx — Dashboard UI with grid layout
- components/WidgetGrid.tsx — Responsive grid component
- prisma/schema.prisma — Widget model with type, config, position
- tests/widgets/types.test.ts — Zod schema validation tests
- tests/widgets/service.test.ts — CRUD operation tests

## Acceptance Criteria

- [ ] The Real-time refresh with configurable polling interval capability is available through the intended application surface.
- [ ] Core validation, error handling, and persistence for Real-time refresh with configurable polling interval are covered by tests.

## Implementation Notes

- Start from domain rules and access constraints before UI or transport details.
- Keep module boundaries explicit so later extraction remains possible if the system grows.
- Update docs and tests in the same change instead of leaving them for cleanup.
