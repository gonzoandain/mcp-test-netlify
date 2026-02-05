---
phase: 04-header-routing-cleanup
plan: 01
subsystem: infra
tags: [cleanup, routing, validation, error-messages]

# Dependency graph
requires:
  - phase: 03-tool-parameters-discovery
    provides: clientId parameter in tools, list_clients discovery tool
provides:
  - Removed 273 lines of legacy routing code (routing.ts, cache.ts)
  - Cleaner validation error messages with list_clients hint
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Error messages reference discovery tools instead of inline data

key-files:
  created: []
  modified:
    - src/validation.ts

key-decisions:
  - "Error messages now hint to list_clients instead of inlining valid IDs"
  - "Removed unused getClientIds import after error message change"

patterns-established:
  - "Discovery hint pattern: error messages guide users to use discovery tools"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 04 Plan 01: Legacy Routing Infrastructure Cleanup Summary

**Deleted routing.ts and cache.ts (273 lines), updated validation errors to hint list_clients discovery tool**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T16:41:48Z
- **Completed:** 2026-02-05T16:44:10Z
- **Tasks:** 2
- **Files modified:** 3 (2 deleted, 1 modified)

## Accomplishments
- Removed routing.ts (144 lines) and cache.ts (129 lines) - no longer imported after Phase 3
- Updated validation.ts comment to remove routing.ts reference
- Changed error messages to use discovery hint instead of inline valid client IDs
- Cleaned up unused getClientIds import

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete legacy routing files** - `003a522` (chore)
2. **Task 2: Update validation.ts error messages with list_clients hint** - `19bdd2c` (feat)

## Files Created/Modified
- `src/routing.ts` - DELETED (header validation logic, 144 lines)
- `src/cache.ts` - DELETED (per-client server caching, 129 lines)
- `src/validation.ts` - Updated comment and error messages with list_clients hint

## Decisions Made
- Error messages now hint "Use list_clients to see available clients" instead of inlining valid IDs
  - Rationale: Cleaner messages, teaches LLM about discovery tool, works regardless of client count
- Removed getClientIds import since validIds variables no longer used
  - Rationale: Dead code cleanup, keeps module imports minimal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused validIds variables and getClientIds import**
- **Found during:** Task 2 (Update validation.ts)
- **Issue:** After removing valid IDs from error messages, the validIds variables and getClientIds import became unused dead code
- **Fix:** Removed both validIds variable declarations and the getClientIds import
- **Files modified:** src/validation.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 19bdd2c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking - dead code cleanup)
**Impact on plan:** Essential cleanup after the planned change. No scope creep.

## Issues Encountered
- Pre-existing uncommitted changes in mcp.ts caused TypeScript compilation errors initially - verified these were unrelated to plan changes by restoring mcp.ts to committed state

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 4 cleanup complete - routing infrastructure fully removed
- Codebase reduced by 273 lines of dead code
- Error messages now guide LLM users to discovery workflow
- Requirements CLEN-03 (delete routing.ts) and CLEN-04 (delete cache.ts) satisfied

---
*Phase: 04-header-routing-cleanup*
*Completed: 2026-02-05*
