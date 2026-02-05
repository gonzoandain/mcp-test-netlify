# Project Milestones: OneApp MCP Server

## v1.1 LLM-Friendly Tools (Shipped: 2026-02-05)

**Delivered:** Tools directly usable by LLMs via clientId parameter — no HTTP header configuration needed

**Phases completed:** 3-4 (5 plans total)

**Key accomplishments:**
- Extended ClientConfig with optional name/description for discovery
- All 18 API tools accept clientId as first required parameter with validation
- Added list_clients discovery tool for LLM client discovery
- Single server architecture — one instance serves all clients
- Removed 273 lines of legacy routing infrastructure
- Graceful deprecation — X-Client-ID header works but warns

**Stats:**
- 5 plans across 2 phases
- 936 lines of TypeScript
- 1 day from start to ship

**Git range:** `feat(03-01)` → `docs(04)`

**What's next:** TBD (awaiting next milestone definition)

---

## v1.0 Multi-tenant (Shipped: 2026-02-04)

**Delivered:** Multi-tenant MCP server — one deployment serves all clients via X-Client-ID header routing

**Phases completed:** 1-2 (4 plans total)

**Key accomplishments:**
- Config-driven server factory with ClientConfig interface enabling per-client configuration
- CLIENTS_CONFIG JSON env var parsing with validation and backward-compatible fallback
- X-Client-ID header validation with alphanumeric format, duplicate detection, and security-focused error codes
- TTL-based server cache (5-minute) with reset-on-access for per-client McpServer instances
- Full multi-tenant routing integrated into mcp.ts handler

**Stats:**
- 20 files created/modified
- 942 lines of TypeScript
- 2 phases, 4 plans
- 6 min execution time

**Git range:** `feat(01-01)` → `feat(02-02)`

---

*Last updated: 2026-02-05*
