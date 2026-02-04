# Phase 2: Multi-tenant Routing - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Route requests to correct client configuration based on X-Client-ID header. Cache server instances per client with TTL-based eviction. Missing or invalid headers return structured errors.

</domain>

<decisions>
## Implementation Decisions

### Error responses
- JSON format: `{ "error": "message", "code": "ERROR_CODE" }`
- Helpful messages with guidance (e.g., "Missing X-Client-ID header. Provide client identifier.")
- Include machine-readable error codes (MISSING_CLIENT_ID, UNKNOWN_CLIENT, etc.)
- HTTP 403 Forbidden for both missing and unknown client ID

### Cache behavior
- Lazy initialization: create server instance on first request for that client
- TTL-based eviction: 5 minutes idle time (reset on each request)
- Hardcoded TTL, not configurable via env var
- No size limit (TTL handles cleanup)

### Header handling
- Case-insensitive matching: "ClientA" = "clienta"
- Alphanumeric characters only in client IDs (reject special characters)
- Error on duplicate headers: return 400 if multiple X-Client-ID headers sent
- Trim whitespace from header value

### Claude's Discretion
- Exact error code naming conventions
- Cache implementation approach (Map with setTimeout, etc.)
- Logging details for routing decisions

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-multi-tenant-routing*
*Context gathered: 2026-02-04*
