---
phase: 04-header-routing-cleanup
plan: 02
subsystem: api
tags: [mcp, deprecation, documentation, migration]

# Dependency graph
requires:
  - phase: 03-tool-parameters
    provides: clientId parameter support in all tools
provides:
  - Deprecation warning in MCP response for X-Client-ID header
  - Updated README documenting clientId parameter approach
affects: [04-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [response-injection-deprecation-warning]

key-files:
  created: []
  modified:
    - netlify/functions/mcp.ts
    - README.md

key-decisions:
  - "Warning injected into MCP response content array, visible to LLM"
  - "Server-side console.warn for observability"
  - "CLIENTS_CONFIG format documented in README"

patterns-established:
  - "Deprecation warning pattern: inject into response.result.content array"

# Metrics
duration: 8min
completed: 2026-02-05
---

# Phase 4 Plan 2: Deprecation Warning and Documentation Summary

**Deprecation warning injected into MCP response for X-Client-ID header; README updated with CLIENTS_CONFIG multi-client format and clientId parameter documentation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-05T12:00:00Z
- **Completed:** 2026-02-05T12:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- X-Client-ID header detection with deprecation warning visible to LLM/client
- Warning injected into MCP response content array (not just console)
- README updated from single-client CORE_BASE/CLIENT_BASE to multi-client CLIENTS_CONFIG format
- Multi-Client Usage section with list_clients discovery and clientId example

## Task Commits

Each task was committed atomically:

1. **Task 1: Add X-Client-ID deprecation warning in MCP response** - `8593d8a` (feat)
2. **Task 2: Update README for clientId approach** - `410ab51` (docs)

## Files Created/Modified
- `netlify/functions/mcp.ts` - Added X-Client-ID header detection and deprecation warning injection into response
- `README.md` - Updated environment setup, added Multi-Client Usage section with clientId documentation

## Decisions Made
- Warning injected into response.result.content array so LLM sees it (not just HTTP headers or console)
- Server-side console.warn retained for observability
- CLIENTS_CONFIG JSON format documented in README

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Deprecation warning active for existing integrations
- Documentation complete for new clientId-based approach
- Ready for plan 04-03: routing.ts cleanup

---
*Phase: 04-header-routing-cleanup*
*Completed: 2026-02-05*
