# Phase 4: Header Routing Cleanup - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove legacy header-based routing infrastructure. Delete routing.ts and cache.ts. Single server instance handles all clients via clientId parameters (established in Phase 3). Header routing becomes obsolete.

</domain>

<decisions>
## Implementation Decisions

### Error Responses
- Missing clientId: generic message "clientId required" (not listing valid clients)
- Missing and invalid clientId treated with same error pattern
- Validation helper should throw errors (caught at tool level, formatted as MCP error)
- Error messages include hint: "Use list_clients to see available clients"

### Backwards Compatibility
- X-Client-ID header: log deprecation warning (don't reject, don't silently ignore)
- Warning returned in MCP response (not just server console) so LLM/client sees it
- Warning persists permanently until header check code is removed in future version
- Warning message: simple "X-Client-ID header is deprecated" (no migration instructions in message)

### Migration Path
- Clean cut: remove routing code completely (tools already require clientId from Phase 3)
- Update README: remove header instructions, document clientId-only approach
- Scope limited to routing.ts and cache.ts deletion (no broader audit)
- Client configs loaded lazily on first request to that client (not all at startup)

### Claude's Discretion
- How to structure the deprecation warning in MCP response format
- Import cleanup in files that referenced routing.ts or cache.ts
- Test file updates for removed functionality

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard cleanup patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-header-routing-cleanup*
*Context gathered: 2026-02-05*
