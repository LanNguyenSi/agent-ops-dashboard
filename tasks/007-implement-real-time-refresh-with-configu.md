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

- lib/polling/usePolling.ts — React hook for interval-based polling
- lib/polling/config.ts — Polling configuration (intervals, backoff)
- lib/polling/types.ts — Polling types (PollConfig, PollState)
- lib/polling/cache.ts — Client-side cache with stale-while-revalidate
- components/RefreshIndicator.tsx — Visual polling indicator
- components/AutoRefresh.tsx — Auto-refresh toggle component
- tests/polling/usePolling.test.tsx — Hook tests with React Testing Library
- tests/polling/cache.test.ts — Cache logic tests

## Acceptance Criteria

- [ ] The Real-time refresh with configurable polling interval capability is available through the intended application surface.
- [ ] Core validation, error handling, and persistence for Real-time refresh with configurable polling interval are covered by tests.

## Implementation Notes

- Start from domain rules and access constraints before UI or transport details.
- Keep module boundaries explicit so later extraction remains possible if the system grows.
- Update docs and tests in the same change instead of leaving them for cleanup.
