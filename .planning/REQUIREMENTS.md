# Requirements: OneApp MCP Server - LLM-Friendly Tools

**Defined:** 2026-02-05
**Core Value:** One deployment serves all clients — tools directly usable by LLMs

## v1.1 Requirements

Requirements for LLM-friendly tool interface.

### Tool Parameters

- [ ] **TOOL-01**: Every existing tool accepts `clientId` as first required parameter
- [ ] **TOOL-02**: Tool validates clientId and returns error if unknown
- [ ] **TOOL-03**: Tool uses clientId to look up config and make API calls

### Discovery

- [ ] **DISC-01**: New `list_clients` tool returns available client IDs
- [ ] **DISC-02**: `list_clients` includes client names/descriptions if available

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
| TOOL-01 | TBD | Pending |
| TOOL-02 | TBD | Pending |
| TOOL-03 | TBD | Pending |
| DISC-01 | TBD | Pending |
| DISC-02 | TBD | Pending |
| CLEN-01 | TBD | Pending |
| CLEN-02 | TBD | Pending |
| CLEN-03 | TBD | Pending |
| CLEN-04 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9 ⚠️

---
*Requirements defined: 2026-02-05*
