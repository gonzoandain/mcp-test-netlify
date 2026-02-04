# Requirements: OneApp MCP Server - Multi-tenant

**Defined:** 2026-02-04
**Core Value:** One deployment serves all clients — no more manual env var switching

## v1 Requirements

Requirements for multi-tenant support.

### Client Identification

- [x] **CLID-01**: Function extracts X-Client-ID header from incoming requests
- [x] **CLID-02**: Missing X-Client-ID header returns 403 error with clear message (403 chosen over 400 for security)
- [x] **CLID-03**: Unknown client ID returns 403 error with clear message (403 chosen over 400 for security)

### Configuration

- [x] **CONF-01**: All client configs stored in CLIENTS_CONFIG env var as JSON
- [x] **CONF-02**: Each client config has: authorization, baseUrl, clientHeader
- [x] **CONF-03**: Config parsed once at startup, not per-request

### Server Caching

- [x] **CACHE-01**: MCP server cached per client ID (not globally)
- [x] **CACHE-02**: Server for client X reused across requests for client X
- [x] **CACHE-03**: Different clients get different server instances

### Refactoring

- [x] **REFAC-01**: buildOneAppServer accepts config parameter instead of reading env vars
- [x] **REFAC-02**: httpJson uses passed config instead of module-level constants

## v2 Requirements

Deferred to future release.

### Observability

- **OBS-01**: Log which client ID was used for each request
- **OBS-02**: Track per-client request counts

### Configuration Management

- **CFGM-01**: Validate config schema at startup
- **CFGM-02**: Warn if config is missing expected fields

## Out of Scope

| Feature | Reason |
|---------|--------|
| External config database | Env var is simpler, no external dependencies |
| Subdomain routing | Header-based is cleaner, no DNS setup needed |
| Default client fallback | Explicit errors prevent silent misrouting |
| Hot reload configs | Redeploy is fine for config changes |
| Per-client rate limiting | Not needed for current scale |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLID-01 | Phase 2 | Complete |
| CLID-02 | Phase 2 | Complete |
| CLID-03 | Phase 2 | Complete |
| CONF-01 | Phase 1 | Complete |
| CONF-02 | Phase 1 | Complete |
| CONF-03 | Phase 1 | Complete |
| CACHE-01 | Phase 2 | Complete |
| CACHE-02 | Phase 2 | Complete |
| CACHE-03 | Phase 2 | Complete |
| REFAC-01 | Phase 1 | Complete |
| REFAC-02 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 - All v1 requirements complete*
