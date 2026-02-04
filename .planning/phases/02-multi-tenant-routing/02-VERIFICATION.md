---
phase: 02-multi-tenant-routing
verified: 2026-02-04T22:45:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 2: Multi-tenant Routing Verification Report

**Phase Goal:** Requests are routed to correct client based on X-Client-ID header
**Verified:** 2026-02-04T22:45:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Request with X-Client-ID header gets response using that client's config | ✓ VERIFIED | mcp.ts lines 36-49: Validates header, looks up config via getClientConfig(clientId), passes clientConfig to buildOneAppServer() |
| 2 | Request without X-Client-ID header returns 403 with message "Missing X-Client-ID header" | ✓ VERIFIED | routing.ts line 31: MISSING_CLIENT_ID message is "Missing X-Client-ID header. Provide client identifier.". mcp.ts lines 26-30: Returns 403 for validation failures except DUPLICATE |
| 3 | Request with unknown X-Client-ID returns 403 with message "Unknown client ID: [id]" | ✓ VERIFIED | routing.ts line 34: UNKNOWN_CLIENT template "Unknown client ID: {id}". mcp.ts line 38: createUnknownClientError(clientId) interpolates clientId into message, returns 403 |
| 4 | Second request for same client ID reuses cached server instance (no re-initialization) | ✓ VERIFIED | mcp.ts lines 42-49: serverCache.get(clientId) returns existing server. Console log "Reusing cached MCP server for client: {clientId}" confirms reuse. cache.ts lines 52-64: TTL resets on get() |
| 5 | Requests for different clients use different server instances | ✓ VERIFIED | cache.ts line 33: Map<string, CacheEntry> keyed by clientId ensures per-client isolation. mcp.ts line 44: buildOneAppServer(clientConfig) creates new server per clientId cache miss |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/routing.ts` | Header validation, error codes, error response helpers | ✓ VERIFIED | 143 lines. Exports: validateClientHeader, createErrorResponse, ERROR_CODES, RoutingError, createUnknownClientError. Validates alphanumeric clientId, detects duplicates, returns discriminated union ValidationResult |
| `src/cache.ts` | TTL-based server cache | ✓ VERIFIED | 128 lines. Exports: ServerCache class, serverCache singleton. DEFAULT_TTL_MS = 5 minutes. TTL resets on get(). timer.unref() prevents blocking exit. Methods: get, set, has, size |
| `netlify/functions/mcp.ts` | Multi-tenant MCP endpoint with routing | ✓ VERIFIED | 179 lines. Imports routing, cache, config modules. Lines 25-49: Multi-tenant routing flow (validate, lookup config, get/create server). Removed old single-tenant code (cached, getServer) |
| `src/config.ts` | Client config lookup | ✓ VERIFIED | 88 lines (from Phase 1). Exports: clientsConfig, getClientConfig, getClientIds. Parses CLIENTS_CONFIG at module load. getClientConfig(clientId) returns ClientConfig or undefined |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| mcp.ts | routing.ts | validateClientHeader import | ✓ WIRED | Line 9: imports validateClientHeader. Line 26: calls validateClientHeader(req.headers). Line 29: uses ERROR_CODES for status logic |
| mcp.ts | cache.ts | serverCache import | ✓ WIRED | Line 10: imports serverCache. Line 42: serverCache.get(clientId). Line 45: serverCache.set(clientId, mcpServer) |
| mcp.ts | config.ts | getClientConfig | ✓ WIRED | Line 11: imports getClientConfig. Line 36: calls getClientConfig(clientId). Line 37: checks if null (unknown client) |
| routing.ts | config.ts | N/A (no direct link) | ✓ CORRECT | Per plan: getClientConfig check happens in mcp.ts, not routing.ts. Routing only validates header format |
| cache.ts | @modelcontextprotocol/sdk | McpServer type | ✓ WIRED | Line 6: imports McpServer from '@modelcontextprotocol/sdk/server/mcp.js'. Used as generic type in CacheEntry and ServerCache methods |
| mcp.ts | oneappServer.ts | buildOneAppServer | ✓ WIRED | Line 8: imports buildOneAppServer. Line 44: calls buildOneAppServer(clientConfig) with per-client config |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| CLID-01: Function extracts X-Client-ID header | ✓ SATISFIED | routing.ts validateClientHeader extracts via headers.get('x-client-id') |
| CLID-02: Missing X-Client-ID returns 400 with message | ⚠️ PARTIALLY SATISFIED | Returns 403 (not 400) per CONTEXT.md design decision. Message is correct: "Missing X-Client-ID header. Provide client identifier." |
| CLID-03: Unknown client ID returns 400 with message | ⚠️ PARTIALLY SATISFIED | Returns 403 (not 400) per CONTEXT.md design decision. Message is correct: "Unknown client ID: {id}. Check X-Client-ID header value." |
| CACHE-01: MCP server cached per client ID | ✓ SATISFIED | cache.ts ServerCache uses Map<string, CacheEntry> keyed by clientId |
| CACHE-02: Server reused across requests | ✓ SATISFIED | serverCache.get(clientId) returns existing server, console log confirms reuse |
| CACHE-03: Different clients get different servers | ✓ SATISFIED | Map keyed by clientId ensures isolation. buildOneAppServer called per unique clientId |

**Note:** CLID-02 and CLID-03 specify 400 status code, but implementation uses 403. This is intentional per CONTEXT.md design decision: "403 for missing/invalid/unknown client, 400 only for duplicate header". This is a better security practice (403 = forbidden/authentication issue vs 400 = bad request syntax).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/oneappServer.ts | 134 | Contains "cliente" in Spanish comment | ℹ️ Info | Leftover Spanish text in comment, no functional impact |

**No blocker anti-patterns found.**

All files are substantive implementations:
- No TODO/FIXME/placeholder comments in routing, cache, or mcp.ts
- No empty return statements or stub functions
- No console.log-only handlers
- All functions have real implementations

### TypeScript Compilation

```bash
npx tsc --noEmit
```

**Result:** ✓ PASS — compiles without errors

## Verification Details

### Truth 1: Request with X-Client-ID uses client's config

**Evidence:**
1. mcp.ts line 26: `validateClientHeader(req.headers)` extracts clientId
2. mcp.ts line 36: `getClientConfig(clientId)` retrieves client-specific config
3. mcp.ts line 44: `buildOneAppServer(clientConfig)` creates server with that config
4. oneappServer.ts lines 21-28: httpJson uses config.authorization, config.clientHeader

**Wiring:** validateClientHeader → clientId → getClientConfig → clientConfig → buildOneAppServer

**Status:** ✓ VERIFIED - Complete flow from header to client-specific server

### Truth 2: Missing X-Client-ID returns 403 with message

**Evidence:**
1. routing.ts lines 93-100: Returns MISSING_CLIENT_ID error when header is null
2. routing.ts line 31: Message is "Missing X-Client-ID header. Provide client identifier."
3. mcp.ts lines 29-30: Returns 403 status (400 only for DUPLICATE_CLIENT_ID)
4. routing.ts lines 52-59: createErrorResponse formats as JSON with error and code

**Message format:** `{ "error": "Missing X-Client-ID header. Provide client identifier.", "code": "MISSING_CLIENT_ID" }`

**Status:** ✓ VERIFIED - Exact message match, 403 status

### Truth 3: Unknown X-Client-ID returns 403 with message

**Evidence:**
1. mcp.ts line 36: `getClientConfig(clientId)` returns undefined for unknown client
2. mcp.ts line 38: `createUnknownClientError(clientId)` creates error with interpolated clientId
3. routing.ts lines 69-73: Message template "Unknown client ID: {id}" with {id} replaced by clientId
4. mcp.ts line 38: Returns 403 status via createErrorResponse

**Message format:** `{ "error": "Unknown client ID: test123. Check X-Client-ID header value.", "code": "UNKNOWN_CLIENT" }`

**Status:** ✓ VERIFIED - Message interpolates clientId correctly, 403 status

### Truth 4: Second request reuses cached server

**Evidence:**
1. cache.ts lines 52-64: get() returns cached server if exists
2. cache.ts lines 60-61: Resets TTL timer on access (reset-on-access behavior)
3. mcp.ts lines 42-49: If serverCache.get(clientId) returns value, uses it directly
4. mcp.ts line 48: Console log "Reusing cached MCP server for client: {clientId}" confirms reuse
5. cache.ts line 12: TTL is 5 minutes (300,000ms)

**Cache behavior:**
- First request: cache miss → buildOneAppServer → serverCache.set → "Created new MCP server"
- Second request (within 5 min): cache hit → serverCache.get → "Reusing cached MCP server"
- Each access resets 5-minute TTL

**Status:** ✓ VERIFIED - Cache reuse implemented with TTL reset

### Truth 5: Different clients get different servers

**Evidence:**
1. cache.ts line 33: `Map<string, CacheEntry>` keyed by clientId
2. mcp.ts line 42: `serverCache.get(clientId)` retrieves per-client server
3. mcp.ts line 44: Cache miss creates new server via buildOneAppServer(clientConfig)
4. mcp.ts line 45: `serverCache.set(clientId, mcpServer)` stores per-client

**Isolation proof:**
- Client "acme": serverCache.get("acme") → unique McpServer instance for acme's config
- Client "globex": serverCache.get("globex") → unique McpServer instance for globex's config
- Map ensures separate entries: { "acme": { server: McpServer1 }, "globex": { server: McpServer2 } }

**Status:** ✓ VERIFIED - Per-client isolation via Map keying

## Human Verification Required

While automated checks verify the structure and wiring, the following should be tested manually:

### 1. End-to-End Request Flow

**Test:** Send POST request to /mcp endpoint with valid X-Client-ID header
**Expected:** 
- Request routed to correct client's server
- Response contains data from that client's OneApp instance
- Console shows "Created new MCP server" or "Reusing cached MCP server"

**Why human:** Requires running server, configured CLIENTS_CONFIG, and real OneApp API

### 2. Missing Header Behavior

**Test:** Send POST request without X-Client-ID header
**Expected:** 
- 403 status code
- JSON response: `{ "error": "Missing X-Client-ID header. Provide client identifier.", "code": "MISSING_CLIENT_ID" }`

**Why human:** Requires deployed environment or local server

### 3. Unknown Client Behavior

**Test:** Send POST request with X-Client-ID: "nonexistent"
**Expected:**
- 403 status code
- JSON response: `{ "error": "Unknown client ID: nonexistent. Check X-Client-ID header value.", "code": "UNKNOWN_CLIENT" }`

**Why human:** Requires deployed environment or local server

### 4. Cache TTL Behavior

**Test:** 
1. Send request with X-Client-ID: "test"
2. Wait 6 minutes
3. Send second request with X-Client-ID: "test"

**Expected:**
- First request: console shows "Created new MCP server for client: test"
- Second request: console shows "Created new MCP server for client: test" (cache expired)

**Why human:** Requires 6-minute wait and running server

### 5. Cache Reset-on-Access

**Test:**
1. Send request with X-Client-ID: "test"
2. Wait 4 minutes
3. Send second request with X-Client-ID: "test"
4. Wait 4 more minutes
5. Send third request with X-Client-ID: "test"

**Expected:**
- First request: "Created new MCP server"
- Second request (4 min later): "Reusing cached MCP server" (TTL reset)
- Third request (8 min from first, 4 min from second): "Reusing cached MCP server" (TTL was reset at step 3)

**Why human:** Requires timing control and running server

### 6. Multi-Client Isolation

**Test:**
1. Configure CLIENTS_CONFIG with two clients: "client-a" and "client-b"
2. Send request with X-Client-ID: "client-a"
3. Send request with X-Client-ID: "client-b"
4. Verify each gets response from their respective OneApp instance

**Expected:**
- client-a request uses client-a's authorization/baseUrl
- client-b request uses client-b's authorization/baseUrl
- Console shows "Created new MCP server" for each client

**Why human:** Requires multi-client configuration and real OneApp instances

## Summary

**Phase Goal:** ✓ ACHIEVED

All 5 success criteria are verified through code inspection:
1. ✓ Client-specific routing based on X-Client-ID header
2. ✓ Missing header returns 403 with correct message
3. ✓ Unknown client returns 403 with interpolated message
4. ✓ Server caching with TTL reset on access
5. ✓ Per-client server isolation

**Implementation Quality:**
- All required artifacts exist and are substantive (143-179 lines each)
- All key links are wired correctly
- TypeScript compiles without errors
- No blocker anti-patterns found
- Proper error handling with discriminated unions
- Security-focused status codes (403 for auth failures)

**Requirements Coverage:**
- CLID-01: ✓ Satisfied
- CLID-02: ⚠️ Uses 403 instead of 400 (intentional design decision)
- CLID-03: ⚠️ Uses 403 instead of 400 (intentional design decision)
- CACHE-01: ✓ Satisfied
- CACHE-02: ✓ Satisfied
- CACHE-03: ✓ Satisfied

**Human verification recommended** for end-to-end testing, but automated structural verification confirms all mechanisms are in place.

---

_Verified: 2026-02-04T22:45:00Z_
_Verifier: Claude (gsd-verifier)_
