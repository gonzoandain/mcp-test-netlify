# Codebase Concerns

**Analysis Date:** 2026-02-04

## Tech Debt

**Pervasive use of `any` type:**
- Issue: All API responses are typed as `any`, bypassing TypeScript's type safety despite strict mode being enabled in tsconfig.json
- Files: `src/oneappServer.ts` (18 occurrences at lines 96, 115, 124, 136, 148, 168, 185, 198, 221, 238, 257, 272, 287, 301, 316, 330, 347, 360)
- Impact: Impossible to detect data shape mismatches, serialization errors, or breaking API changes at compile time. Runtime errors in dependent code become unpredictable.
- Fix approach: Create Zod schemas for each external API response type and parse responses with `httpJson<T>(...).pipe(schema.parse)` to get runtime validation and proper types

**Weak error handling in tool implementations:**
- Issue: Tools at lines 95-101 and 359-365 have catch blocks that just re-throw errors with no additional context or logging
- Files: `src/oneappServer.ts` (lines 95-101, 359-365)
- Impact: Stack traces lack context about which operation failed. Difficult to debug in production. No information about which customer/zone/checklist failed.
- Fix approach: Add contextual error information like tool name, parameters, and API being called. Example: `throw new Error(&#x27;core_list_sucursales failed: ${error.message}&#x27;)`

**Missing test coverage:**
- Issue: No test files exist (test.ts is empty, no .test.ts or .spec.ts files found)
- Files: All source files, particularly `netlify/functions/mcp.ts` (179 lines) and `src/oneappServer.ts` (370 lines)
- Impact: Session management complexity in mcp.ts (multiple transport cache scenarios, cleanup logic) has no validation. Tool implementations have no unit tests to catch API schema changes.
- Fix approach: Add vitest or jest with unit tests for httpJson helper, session management, and each tool's happy path and error cases

## Known Bugs

**Session cleanup race condition:**
- Symptoms: Stale transports may remain in memory if onclose handler fires while requests are still being processed
- Files: `netlify/functions/mcp.ts` (lines 75-84, 112-120)
- Trigger: Rapid initialization/close cycles or network interruptions during session handoff
- Workaround: Relies on Netlify function reuse timeout to eventually clear state. May leak memory in edge cases.

**Inconsistent session ID handling:**
- Symptoms: Two separate code paths (lines 57-93 and 94-151) both create transports but with different logic for session ID management
- Files: `netlify/functions/mcp.ts` (lines 57-93 for reuse path, lines 94-151 for non-initialization path)
- Trigger: Requests without prior initialization or with malformed session headers
- Workaround: Both paths store transport by session ID, but the synthetic initialization logic (lines 129-150) only executes when not reusing a transport, creating asymmetric behavior

**Incomplete response parsing:**
- Symptoms: Line 67 reads full response body as text then parses as JSON, then line 77 calls response.json() again on consumed stream
- Files: `src/oneappServer.ts` (lines 67-77)
- Trigger: API errors or malformed responses
- Workaround: Currently works because text() is called before json(), but response body stream is one-time-use and this pattern wastes memory

## Security Considerations

**Credentials passed in memory as plain module-level constants:**
- Risk: `AUTHORIZATION` and `CLIENT_HEADER` stored as module-level const strings in `src/oneappServer.ts`. Credentials visible in process memory, could appear in crash dumps or debugging output.
- Files: `src/oneappServer.ts` (lines 18-19, 42-48)
- Current mitigation: Environment variables redacted from logging in development mode (lines 25-28), but the values themselves are never redacted from memory or error messages
- Recommendations: (1) Use Netlify environment secrets (not shown in debug output) (2) Read credentials from env at request time instead of module init (3) Never log full headers/auth values, use placeholder format

**Environment variable fallback to hardcoded URLs:**
- Risk: `CORE_BASE_URL` defaults to `https://api.oneapp.cl` and `CLIENT_BASE_URL` defaults to `https://sechpos.oneapp.cl` (lines 16-17). If env vars are unset, requests go to real production APIs instead of failing.
- Files: `src/oneappServer.ts` (lines 16-17)
- Current mitigation: Development logging shows when vars are unset, but no runtime validation prevents requests to defaults
- Recommendations: (1) Require these vars explicitly with `|| throw new Error(...)` (2) Add NODE_ENV check: only allow defaults in development, require explicit vars in production

**Full HTTP response headers logged on error:**
- Risk: Authorization headers and other sensitive metadata exposed in error logs (line 71)
- Files: `src/oneappServer.ts` (lines 68-73)
- Current mitigation: Logs only appear when HTTP errors occur, not on every request
- Recommendations: Filter response headers before logging; only log status/statusText, redact Authorization/Cookie/client headers

**No rate limiting or request validation:**
- Risk: Tools accept user input (zone_id, check_id, search terms) without validation beyond Zod schema. No checks for injection, DOS, or resource exhaustion.
- Files: `src/oneappServer.ts` (all tool definitions, particularly lines 108-118, 155-171, 206-224)
- Current mitigation: Zod provides input shape validation but not business logic constraints (e.g., search string length limits, ID ranges)
- Recommendations: (1) Add max string lengths to Zod schemas (2) Implement rate limiting on /mcp endpoint (3) Log and reject suspicious patterns (huge page numbers, etc.)

## Performance Bottlenecks

**Synchronous module initialization with network calls:**
- Problem: `httpJson` uses AbortController with setTimeout for timeout handling. If an API is slow at startup, the function will block.
- Files: `src/oneappServer.ts` (lines 32-85)
- Cause: No connection pooling, timeout set to 30 seconds (line 20), sequential calls in catch blocks don't batch or retry
- Improvement path: (1) Implement HTTP client with connection pooling/keep-alive (2) Add exponential backoff for retries (3) Cache DNS lookups if calling same base URL repeatedly

**No caching of API responses:**
- Problem: Every call to `core_list_sucursales` (line 92-103), `core_list_zonas` (line 105-118), etc. makes a fresh HTTP request. If called repeatedly in same session, duplicates work.
- Files: `src/oneappServer.ts` (all tool implementations)
- Cause: Stateless design; no response cache decorator
- Improvement path: Add optional TTL-based cache layer for read-only tools (sucursales, zonas, subgerencias). Store in transport session state or memory with 1-minute TTL.

**Multiple tools make independent HTTP requests:**
- Problem: `visual_area_categoria_razones` (line 322-333) requires users to first call `visual_areas` and `visual_categorias` separately, each making network round-trips
- Files: `src/oneappServer.ts` (lines 262-333)
- Cause: Microservice design of OneApp API means related data comes from separate endpoints
- Improvement path: Consider batch endpoint that fetches areas + categories + reasons in one call if API supports it, or add internal caching/pre-fetch strategy

**Session transport held in global object indefinitely:**
- Problem: `transports: { [sessionId: string]: ... }` (line 38) grows unbounded if onclose handlers don't fire reliably
- Files: `netlify/functions/mcp.ts` (lines 37-38, 75-84, 112-120)
- Cause: No TTL or cleanup policy; relies entirely on onclose callback executing
- Improvement path: Add background cleanup of transports older than 1 hour; implement WeakMap if possible, or add explicit session ID rotation

## Fragile Areas

**HTTP helper function used by all tools:**
- Files: `src/oneappServer.ts` (lines 32-85)
- Why fragile: Single function handles headers, timeouts, errors, and parsing. Any change affects all 18+ tools. Error handling is minimal (lines 78-84).
- Safe modification: (1) Add comprehensive tests before changing error paths (2) Extract header building logic into separate function (3) Use HTTP client library with built-in retry/error handling instead of raw fetch
- Test coverage: Zero. No tests for timeout behavior, network errors, malformed responses, or header edge cases.

**Session management in mcp.ts:**
- Files: `netlify/functions/mcp.ts` (lines 37-127)
- Why fragile: Two separate code paths (reuse vs. new session) both manage same global transports object. Cleanup logic duplicated (lines 75-84 and 112-120). Synthetic initialization (lines 129-150) assumes request shape.
- Safe modification: (1) Refactor to single path that handles both cases (2) Extract transport creation/cleanup into helper functions (3) Add type guards for request validation
- Test coverage: Zero. No tests for session lifecycle, reuse, cleanup, or initialization variations.

**Environment variable loading at startup:**
- Files: `src/oneappServer.ts` (lines 4-29)
- Why fragile: Conditional dotenv import (lines 6-12) swallows errors silently. If dotenv fails, no indication. Logging happens at startup but credentials are loaded once and never refreshed.
- Safe modification: (1) Always require explicit env setup, don't conditionally import (2) Validate all required vars exist before server starts (3) Consider hot-reload for credential changes
- Test coverage: Zero. No tests for missing env vars, dotenv errors, or different NODE_ENV values.

## Scaling Limits

**Global transports object unbounded growth:**
- Current capacity: Netlify functions typically reset every 15 minutes; at that point, global state is cleared
- Limit: If sessions don't close cleanly and function stays warm, unlimited transport objects accumulate in memory
- Scaling path: (1) Implement explicit session TTL (invalidate > 1 hour old) (2) Use LRU cache for last N sessions (3) Monitor Netlify function memory usage and alert on unbounded growth

**Single MCP server instance shared across all concurrent requests:**
- Current capacity: `getServer()` caches one server, env-hash invalidates it if env changes
- Limit: If env vars change during runtime (Netlify deploys), server is recreated but no way to drain existing requests
- Scaling path: (1) Implement graceful shutdown hook (2) Add request-scoped servers instead of global cache (3) Use Netlify environment secrets (immutable during execution)

**No pagination limits on HTTP requests:**
- Current capacity: Most tools accept `limit: max(100)` but `search` terms are unlimited strings
- Limit: Malicious actors could send huge search strings or request page 999999, causing backend DOS
- Scaling path: (1) Add server-side pagination validation with maximum reasonable values (2) Implement rate limiting per client/session (3) Add backpressure/circuit breaker for slow API responses

## Dependencies at Risk

**Lightweight fetch-to-node dependency:**
- Risk: Used to convert Netlify Web-standard Request/Response to Node.js req/res. Low maintenance, no recent updates likely.
- Impact: If it breaks, no compatibility layer between Netlify and MCP SDK
- Migration plan: Could switch to Node.js built-in Request/Response if available (Node 18+), or replace with custom adapter

**MCP SDK version pinned to ^1.2.0:**
- Risk: Range allows patch updates but major version breaks are possible. No lock file inspection done.
- Impact: Breaking protocol changes could require immediate code updates
- Migration plan: Check MCP SDK changelog before updating. Add integration tests to validate protocol compatibility.

**TypeScript strict mode enabled but not enforced:**
- Risk: tsconfig.json enables strict mode (line 9) but codebase uses `any` extensively, defeating its purpose
- Impact: Developers have false confidence in type safety
- Migration plan: Enable stricter eslint rules like `@typescript-eslint/no-explicit-any` to prevent new `any` uses. Gradually type existing code.

## Missing Critical Features

**No request/response logging or tracing:**
- Problem: When an API call fails in production, no information about what was sent or received (beyond the error text)
- Blocks: Debugging customer issues, auditing API calls, detecting patterns in failures

**No input validation on tool parameters:**
- Problem: Zod schemas check type/range but don't validate business logic (e.g., is this zone_id actually valid for this customer?)
- Blocks: Early detection of user errors; API calls made with invalid parameters that fail at backend

**No retry logic for transient failures:**
- Problem: Network timeouts or temporary API errors cause tool execution to fail immediately
- Blocks: Resilient behavior; users must manually retry

**No health checks or endpoint validation:**
- Problem: If OneApp API goes down, MCP server still initializes and serves stale data or always-fails tools
- Blocks: Graceful degradation; early detection of infrastructure issues

## Test Coverage Gaps

**No tests for httpJson helper:**
- What's not tested: Timeout behavior, error responses (400/401/500), malformed JSON, header construction, abort controller cleanup
- Files: `src/oneappServer.ts` (lines 32-85)
- Risk: Changes to error handling or timeout logic could break silently. Network-related bugs go undetected.
- Priority: High (critical utility used by all tools)

**No tests for tool implementations:**
- What's not tested: Each of 18 tools' parameter validation, API call construction, response parsing
- Files: `src/oneappServer.ts` (lines 91-367)
- Risk: API schema changes (response field renames) not caught. Tool parameter edge cases not exercised.
- Priority: High (primary API surface)

**No tests for session management:**
- What's not tested: Session lifecycle (create, reuse, close), cleanup logic, transport deduplication, synthetic initialization
- Files: `netlify/functions/mcp.ts` (lines 12-127)
- Risk: Memory leaks, session collisions, inconsistent state in production.
- Priority: High (critical for long-running serverless)

**No tests for environment loading:**
- What's not tested: Missing env vars, invalid values, dotenv load success/failure, fallback URLs
- Files: `src/oneappServer.ts` (lines 4-29)
- Risk: Server initializes with wrong credentials or defaults without warning.
- Priority: Medium (startup-time issue, caught in staging before production)

**No integration tests with OneApp API:**
- What's not tested: Real API calls to test/staging OneApp instance
- Files: All tool implementations
- Risk: Incompatibility with OneApp API discovered in production after deploy
- Priority: Medium (requires external API access)

---

*Concerns audit: 2026-02-04*
