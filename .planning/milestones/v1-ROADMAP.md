# Milestone v1: Multi-tenant

**Status:** ✅ SHIPPED 2026-02-04
**Phases:** 1-2
**Total Plans:** 4

## Overview

Transform the existing single-client MCP server into a multi-tenant system. Phase 1 refactors the server to accept configuration parameters instead of reading env vars directly, and implements JSON config loading. Phase 2 adds client identification via headers and per-client server caching, completing the multi-tenant capability.

## Phases

### Phase 1: Foundation Refactoring

**Goal**: Server accepts configuration as parameter, enabling multiple configs to coexist
**Depends on**: Nothing (first phase)
**Requirements**: REFAC-01, REFAC-02, CONF-01, CONF-02, CONF-03
**Success Criteria**:
  1. `buildOneAppServer()` accepts a config object with authorization, baseUrl, clientHeader
  2. `httpJson()` uses config passed to it, not module-level constants
  3. CLIENTS_CONFIG env var parsed at startup and available as typed object
  4. Server can be instantiated with config for any client defined in CLIENTS_CONFIG
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md - Refactor server to accept config parameter (types, httpJson, buildOneAppServer)
- [x] 01-02-PLAN.md - Add CLIENTS_CONFIG parsing and accessor functions

**Completed:** 2026-02-04

### Phase 2: Multi-tenant Routing

**Goal**: Requests are routed to correct client based on X-Client-ID header
**Depends on**: Phase 1
**Requirements**: CLID-01, CLID-02, CLID-03, CACHE-01, CACHE-02, CACHE-03
**Success Criteria**:
  1. Request with X-Client-ID header gets response using that client's config
  2. Request without X-Client-ID header returns 403 with message "Missing X-Client-ID header"
  3. Request with unknown X-Client-ID returns 403 with message "Unknown client ID: [id]"
  4. Second request for same client ID reuses cached server instance (no re-initialization)
  5. Requests for different clients use different server instances
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md - Create routing and cache modules (header validation, TTL cache)
- [x] 02-02-PLAN.md - Integrate routing into mcp.ts handler

**Completed:** 2026-02-04

---

## Milestone Summary

**Decimal Phases:** None (no urgent insertions required)

**Key Decisions:**
- X-Client-ID header for client identification — clean, standard practice
- JSON env var for all configs — simple, no external dependencies
- Per-client server caching with 5-min TTL — efficient reuse
- 403 for missing/invalid/unknown client — security-focused status codes
- Required config parameter (not optional) — enforce explicit configuration
- Closure pattern for httpJson — config captured per server instance
- Fallback to legacy env vars — backward compatibility during migration
- Alphanumeric-only client IDs — URL-safe, prevents injection
- TTL reset on access — LRU-like behavior for cache efficiency
- timer.unref() — prevent blocking process exit

**Issues Resolved:**
- Single-tenant limitation removed
- Manual env var switching eliminated
- Per-client isolation achieved

**Issues Deferred:**
- OBS-01: Log which client ID was used for each request (v2)
- OBS-02: Track per-client request counts (v2)
- CFGM-01: Validate config schema at startup (v2)
- CFGM-02: Warn if config is missing expected fields (v2)

**Technical Debt Incurred:**
- Spanish text "cliente" in oneappServer.ts:134 comment (cosmetic)

---

*For current project status, see .planning/ROADMAP.md (created for next milestone)*

---
*Archived: 2026-02-04 as part of v1 milestone completion*
