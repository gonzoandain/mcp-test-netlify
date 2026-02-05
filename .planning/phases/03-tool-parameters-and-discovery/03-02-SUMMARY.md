---
phase: 03-tool-parameters-and-discovery
plan: 02
subsystem: api
tags: [typescript, mcp, tools, clientId, validation]

# Dependency graph
requires:
  - phase: 03-tool-parameters-and-discovery
    plan: 01
    provides: validateClientId helper and createClientIdErrorResult
provides:
  - All 18 tools accept clientId as first required parameter
  - Standalone httpJson module accepting config
  - Single server instance architecture (no per-client servers)
affects: [03-03, 04-tool-infrastructure-removal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tool-level clientId validation (vs header-based routing)
    - Config passed to httpJson (vs closure capture)
    - Single server instance for all clients

key-files:
  created:
    - src/httpClient.ts
  modified:
    - src/oneappServer.ts
    - netlify/functions/mcp.ts

key-decisions:
  - "Single MCP server instance serves all clients (tools validate clientId internally)"
  - "httpJson extracted to standalone module accepting config as first parameter"
  - "Header-based routing removed from mcp.ts (preparation for Phase 4)"

patterns-established:
  - "Every tool handler starts with validateClientId(clientId) check"
  - "Invalid clientId returns isError:true enabling LLM self-correction"
  - "httpJson(config, baseUrl, path, options) pattern for API calls"

# Metrics
duration: 8min
completed: 2026-02-05
---

# Phase 03 Plan 02: Tool ClientId Parameters Summary

**All 18 tools refactored to accept clientId as first required parameter with validation and error handling for LLM self-correction**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-05
- **Completed:** 2026-02-05
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extracted httpJson helper to standalone `src/httpClient.ts` module
- Refactored all 18 tools to accept clientId as first required parameter
- Each tool handler validates clientId and returns isError:true on invalid
- Updated netlify/functions/mcp.ts to use single server instance
- Removed header-based client routing (tools now handle client selection internally)
- TypeScript compiles without errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract httpJson to standalone module** - `3367e24` (feat)
2. **Task 2: Refactor oneappServer.ts tools with clientId parameter** - `3650b13` (feat)

## Files Created/Modified

- `src/httpClient.ts` - New module with httpJson helper accepting config as parameter
- `src/oneappServer.ts` - All 18 tools now accept clientId, buildOneAppServer() has no parameters
- `netlify/functions/mcp.ts` - Updated to single server instance, removed header routing

## Decisions Made

- **Single server instance architecture** - Instead of creating one MCP server per client (cached by clientId), we now have a single server instance. Each tool validates clientId internally and retrieves the corresponding config. This simplifies the architecture and prepares for Phase 4 header routing removal.
- **httpJson as standalone module** - Extracted from closure pattern to explicit config parameter. This makes the dependency explicit and enables use from any context without closure capture.
- **Header routing removed from mcp.ts** - The validateClientHeader, serverCache, and per-client server creation logic removed. Tools now handle client selection via clientId parameter. This is preparation for Phase 4 but safe to do now since tools require clientId anyway.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated netlify/functions/mcp.ts**

- **Found during:** Task 2 verification (TypeScript compile error)
- **Issue:** `buildOneAppServer()` signature changed from accepting `config` to no parameters. The `netlify/functions/mcp.ts` was still passing config and using per-client server caching.
- **Fix:** Updated mcp.ts to use single server instance pattern, removed header-based routing imports and logic.
- **Files modified:** netlify/functions/mcp.ts
- **Commit:** 3650b13

## Issues Encountered

None beyond the blocking fix documented above.

## User Setup Required

None - no external service configuration required.

## Requirements Fulfilled

- **TOOL-01:** Every tool accepts clientId as first required parameter
- **TOOL-02:** Invalid clientId returns isError:true with valid client list
- **TOOL-03:** Valid clientId uses corresponding config for API calls

## Next Phase Readiness

- list_clients discovery tool ready to implement (Plan 03-03)
- Header routing infrastructure can be removed (Phase 4) - mcp.ts already updated
- No blockers for next plan

---
*Phase: 03-tool-parameters-and-discovery*
*Completed: 2026-02-05*
