# Task 015: Triologue Agent Details

## Priority
P2

## Goal
Show richer agent information: last task, current status message, session info.

## Current State
`lib/agents/client.ts` maps Triologue API response but `lastMessage` is always `null` — API doesn't expose it yet.

## Solution

### Option A: Extend Triologue API
Add to `/gateway/health` response:
```json
{
  "agents": [{
    "id": "ice",
    "name": "Ice",
    "status": "online",
    "lastMessage": "PR #8 gemerged",
    "lastMessageAt": "2026-03-24T09:10:00Z",
    "currentTask": "Reviewing PR #9",
    "sessionKey": "agent:main:main"
  }]
}
```

### Option B: Separate endpoint
`GET /gateway/agents` — returns agent activity log

## Files to Modify

**Triologue (separate repo):**
- `server/src/gateway/routes.ts` — extend health response with agent details

**agent-ops-dashboard:**
- `lib/agents/client.ts` — consume extended response
- `components/AgentCard.tsx` — show lastMessage + currentTask

## Acceptance Criteria

- [ ] AgentCard shows last message with timestamp
- [ ] AgentCard shows current task if available
- [ ] Falls back gracefully when fields not present

## Notes

- Requires coordination with Triologue repo change
- Keep backward-compatible (optional fields)
