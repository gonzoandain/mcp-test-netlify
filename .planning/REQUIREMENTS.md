# Requirements: OneApp MCP Server - LLM-Friendly Tools

**Defined:** 2026-02-05
**Core Value:** One deployment serves all clients — tools directly usable by LLMs

## v1.1 Requirements

Requirements for LLM-friendly tool interface.

### Tool Parameters

- [x] **TOOL-01**: Every existing tool accepts `clientId` as first required parameter
- [x] **TOOL-02**: Tool validates clientId and returns error if unknown
- [x] **TOOL-03**: Tool uses clientId to look up config and make API calls

### Discovery

- [x] **DISC-01**: New `list_clients` tool returns available client IDs
- [x] **DISC-02**: `list_clients` includes client names/descriptions if available

### Cleanup

- [ ] **CLEN-01**: Remove X-Client-ID header validation from request handler
- [ ] **CLEN-02**: Remove per-client server caching (single server handles all clients)
- [ ] **CLEN-03**: Remove routing.ts module (no longer needed)
- [ ] **CLEN-04**: Remove cache.ts module (no longer needed)

## v2 Requirements

Deferred to future release.

(None defined)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Client authentication per tool call | Trust LLM to use correct clientId |
| Rate limiting per client | Not needed for current scale |
| Client-specific tool filtering | All clients have same tools |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOL-01 | Phase 3 | Complete |
| TOOL-02 | Phase 3 | Complete |
| TOOL-03 | Phase 3 | Complete |
| DISC-01 | Phase 3 | Complete |
| DISC-02 | Phase 3 | Complete |
| CLEN-01 | Phase 4 | Pending |
| CLEN-02 | Phase 4 | Pending |
| CLEN-03 | Phase 4 | Pending |
| CLEN-04 | Phase 4 | Pending |

**Coverage:**
- v1.1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-02-05*
*Traceability updated: 2026-02-05 (roadmap creation)*
