---
phase: 03-tool-parameters-and-discovery
plan: 03
subsystem: api
tags: [typescript, mcp, discovery, list_clients]

# Dependency graph
requires:
  - phase: 03-tool-parameters-and-discovery
    plan: 01
    provides: validateClientId helper
  - phase: 03-tool-parameters-and-discovery
    plan: 02
    provides: Single server architecture, clientId parameter on all tools
provides:
  - list_clients discovery tool for LLMs
  - Complete clientId-based tool interface (no header routing)
affects: [04-tool-infrastructure-removal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Discovery tool pattern (no parameters, returns metadata)
    - Optional metadata fields (name, description) with null fallback

key-files:
  created: []
  modified:
    - src/oneappServer.ts

key-decisions:
  - "list_clients returns null for missing name/description (consistent structure vs omitting fields)"

patterns-established:
  - "Discovery tools return consistent JSON structure regardless of config completeness"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 03 Plan 03: Discovery Tool Summary

**list_clients discovery tool added enabling LLMs to discover available clients before making API calls**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05
- **Completed:** 2026-02-05
- **Tasks:** 2 (1 executed, 1 verified as already complete)
- **Files modified:** 1

## Accomplishments

- Added list_clients discovery tool to oneappServer.ts
- Imports getClientIds and clientsConfig from config.js
- Returns all available client IDs with optional name/description metadata
- Verified mcp.ts already uses single server instance (from 03-02)
- TypeScript compiles without errors

## Task Commits

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Add list_clients discovery tool | 70ce561 | Complete |
| 2 | Simplify mcp.ts to use single server | N/A | Already done in 03-02 |

## Files Modified

- `src/oneappServer.ts` - Added list_clients tool and imports from config.js

## Response Format

The list_clients tool returns:

```json
{
  "clients": [
    { "id": "sechpos", "name": "SECH POS", "description": "Retail POS client" },
    { "id": "acme", "name": null, "description": null }
  ]
}
```

## Decisions Made

- **Null for missing metadata** - When ClientConfig doesn't have name or description configured, the response includes `null` values rather than omitting the fields. This provides a consistent structure that LLMs can rely on.

## Deviations from Plan

None - plan executed exactly as written. Task 2 was already completed in Plan 03-02 as documented in that plan's summary.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Requirements Fulfilled

- **DISC-01:** list_clients tool returns available client IDs
- **DISC-02:** Response includes names/descriptions when configured
- **Single server instance** verified (from 03-02)
- **Backward compatibility** maintained - header still works (just not required)

## Phase 03 Completion Status

With this plan complete, Phase 03 "Tool Parameters and Discovery" is fully implemented:

- Plan 01: Validation infrastructure (validateClientId, createClientIdErrorResult)
- Plan 02: All 18 tools accept clientId as first parameter
- Plan 03: list_clients discovery tool

**Phase 3 Requirements Status:**
- TOOL-01: Every tool accepts clientId as first required parameter [DONE]
- TOOL-02: Invalid clientId returns isError:true with valid client list [DONE]
- TOOL-03: Valid clientId uses corresponding config for API calls [DONE]
- DISC-01: list_clients tool returns available client IDs [DONE]
- DISC-02: Response includes names/descriptions when configured [DONE]
- DISC-03: Single server instance for all clients [DONE]

## Next Phase Readiness

Phase 4 "Tool Infrastructure Removal" can proceed:
- Header routing already removed from mcp.ts
- All tools use clientId parameter
- list_clients enables discovery without prior knowledge
- No blockers

---
*Phase: 03-tool-parameters-and-discovery*
*Completed: 2026-02-05*
