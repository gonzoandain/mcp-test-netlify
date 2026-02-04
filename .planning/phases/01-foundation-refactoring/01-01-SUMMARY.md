---
phase: 01-foundation-refactoring
plan: 01
subsystem: api
tags: [typescript, mcp, config, refactoring]

# Dependency graph
requires: []
provides:
  - ClientConfig interface for typed configuration
  - Config-driven buildOneAppServer factory function
  - httpJson closure pattern capturing config
affects: [01-02, multi-tenancy, client-routing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config-driven server factory: buildOneAppServer(config: ClientConfig)"
    - "Closure pattern for httpJson capturing config"
    - "Config construction from env vars in function handler"

key-files:
  created:
    - src/types.ts
  modified:
    - src/oneappServer.ts
    - netlify/functions/mcp.ts

key-decisions:
  - "Required config parameter (not optional) to enforce explicit configuration"
  - "Moved httpJson inside buildOneAppServer as closure to capture config"
  - "Retained backward compatibility via env var construction in mcp.ts"

patterns-established:
  - "ClientConfig interface: Standard configuration shape for client connections"
  - "Server factory pattern: buildOneAppServer(config) returns configured McpServer"
  - "Config closure: HTTP helpers access config via closure scope, not globals"

# Metrics
duration: 2min
completed: 2026-02-04
---

# Phase 01 Plan 01: Config Parameter Refactoring Summary

**Config-driven buildOneAppServer factory with ClientConfig interface enabling future multi-tenancy**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-04T21:39:41Z
- **Completed:** 2026-02-04T21:41:47Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created ClientConfig interface with authorization, coreBaseUrl, clientBaseUrl, clientHeader fields
- Refactored buildOneAppServer to accept ClientConfig parameter instead of reading module-level constants
- Moved httpJson function inside buildOneAppServer as closure capturing config
- Updated mcp.ts to construct config from env vars and pass to server factory
- Maintained full backward compatibility with existing environment variables

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ClientConfig type** - `a620c47` (feat)
2. **Task 2: Refactor httpJson and buildOneAppServer to use config parameter** - `672ceb4` (refactor)
3. **Task 3: Update mcp.ts to pass config** - `f7165fe` (feat)

## Files Created/Modified
- `src/types.ts` - New file with ClientConfig interface definition
- `src/oneappServer.ts` - Refactored to accept config parameter, httpJson as closure
- `netlify/functions/mcp.ts` - Constructs config from env vars, passes to buildOneAppServer

## Decisions Made
- **Required config parameter:** Made config non-optional to enforce explicit configuration at call sites
- **Closure pattern:** httpJson moved inside buildOneAppServer rather than passed as parameter to keep API simple
- **Default timeout:** Kept DEFAULT_HTTP_TIMEOUT_MS constant for fallback, allowing config override

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully with TypeScript compilation passing.

## User Setup Required

None - no external service configuration required. Existing environment variables continue to work.

## Next Phase Readiness
- Config-driven architecture ready for Plan 02 (multi-client config parsing)
- ClientConfig interface can be extended for ClientsConfig dictionary
- Server factory pattern enables per-client server caching

---
*Phase: 01-foundation-refactoring*
*Completed: 2026-02-04*
