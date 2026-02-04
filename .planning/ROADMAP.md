# Roadmap: OneApp MCP Server - Multi-tenant

## Overview

Transform the existing single-client MCP server into a multi-tenant system. Phase 1 refactors the server to accept configuration parameters instead of reading env vars directly, and implements JSON config loading. Phase 2 adds client identification via headers and per-client server caching, completing the multi-tenant capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2): Planned milestone work
- Decimal phases (1.1, 1.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation Refactoring** - Make server config-driven instead of env-var-driven
- [ ] **Phase 2: Multi-tenant Routing** - Add client identification and per-client server caching

## Phase Details

### Phase 1: Foundation Refactoring
**Goal**: Server accepts configuration as parameter, enabling multiple configs to coexist
**Depends on**: Nothing (first phase)
**Requirements**: REFAC-01, REFAC-02, CONF-01, CONF-02, CONF-03
**Success Criteria** (what must be TRUE):
  1. `buildOneAppServer()` accepts a config object with authorization, baseUrl, clientHeader
  2. `httpJson()` uses config passed to it, not module-level constants
  3. CLIENTS_CONFIG env var parsed at startup and available as typed object
  4. Server can be instantiated with config for any client defined in CLIENTS_CONFIG
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md - Refactor server to accept config parameter (types, httpJson, buildOneAppServer)
- [x] 01-02-PLAN.md - Add CLIENTS_CONFIG parsing and accessor functions

### Phase 2: Multi-tenant Routing
**Goal**: Requests are routed to correct client based on X-Client-ID header
**Depends on**: Phase 1
**Requirements**: CLID-01, CLID-02, CLID-03, CACHE-01, CACHE-02, CACHE-03
**Success Criteria** (what must be TRUE):
  1. Request with X-Client-ID header gets response using that client's config
  2. Request without X-Client-ID header returns 400 with message "Missing X-Client-ID header"
  3. Request with unknown X-Client-ID returns 400 with message "Unknown client ID: [id]"
  4. Second request for same client ID reuses cached server instance (no re-initialization)
  5. Requests for different clients use different server instances
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 1.1 -> 1.2 -> 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Refactoring | 2/2 | ✓ Complete | 2026-02-04 |
| 2. Multi-tenant Routing | 0/? | Not started | - |

---
*Roadmap created: 2026-02-04*
*Last updated: 2026-02-04 - Phase 1 complete*
