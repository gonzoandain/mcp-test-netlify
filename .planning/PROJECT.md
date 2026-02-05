# OneApp MCP Server - Multi-tenant

## What This Is

A Netlify-hosted MCP (Model Context Protocol) server that proxies API requests to OneApp's Core and Client APIs. Supports multi-tenant operation where one deployment serves multiple clients via X-Client-ID header routing, each with their own API credentials stored in CLIENTS_CONFIG JSON env var.

## Core Value

One deployment serves all clients — no more manual env var switching to change which client the server talks to.

## Requirements

### Validated

- MCP server running on Netlify Functions — existing
- Session management across warm function invocations — existing
- HTTP client with auth headers, timeout handling — existing
- Tools for Core API (sucursales, zonas, subgerencias) — existing
- Tools for Checklist API (checks, ambitos, preguntas, cuestionarios) — existing
- Tools for Visual API (areas, categorias, razones) — existing
- Tools for MoAI (foto upload/info) — existing
- ✓ Parse X-Client-ID header from incoming requests — v1.0
- ✓ Load client configs from CLIENTS_CONFIG env var (JSON) — v1.0
- ✓ Look up client config by ID on each request — v1.0
- ✓ Return 403 error for missing or unknown client ID — v1.0
- ✓ Cache separate MCP server per client (not one global cache) — v1.0
- ✓ Pass client config to oneappServer instead of reading env vars — v1.0
- ✓ Add clientId parameter to all tools for LLM-friendly client selection — v1.1
- ✓ Remove X-Client-ID header-based routing (tools handle client selection) — v1.1
- ✓ Add list_clients tool for LLM to discover available clients — v1.1

### Active

(None — awaiting next milestone definition)

### Out of Scope

- External database for client configs — keep it simple with env var
- Subdomain or path-based routing — header-based is cleaner
- Default client fallback — explicit errors prevent silent misrouting
- Client config hot-reload — requires redeploy to update configs

## Context

Shipped v1.1 with 936 LOC TypeScript. LLM-friendly tools fully operational.
Tech stack: Netlify Functions, MCP SDK, TypeScript.

Single MCP server serves all clients. Tools accept clientId as first parameter with validation. list_clients enables discovery. X-Client-ID header deprecated but still works with warning.

## Constraints

- **Platform**: Netlify Functions — no long-running server, stateless between cold starts
- **Config source**: Netlify env vars only — no external config service
- **Protocol**: MCP over HTTP POST to /mcp endpoint with X-Client-ID header

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| X-Client-ID header for client identification | Clean, doesn't pollute URL, standard practice | ✓ Good |
| JSON env var for all configs | Simple, no external dependencies, secrets stay in Netlify | ✓ Good |
| Per-client server caching | Reuse MCP server across requests for same client | ✓ Good |
| 403 error for invalid client | Security-focused (was 400), prevents info leakage | ✓ Good |
| Config-driven server factory | buildOneAppServer(config) enables multi-tenancy | ✓ Good |
| Closure pattern for httpJson | Config captured per server instance, no globals | ✓ Good |
| Fallback to legacy env vars | Backward compatibility during migration | ✓ Good |
| 5-min TTL with reset-on-access | Efficient caching without memory bloat | ✓ Good |
| clientId as tool parameter | LLM-friendly, no header config needed | ✓ Good |
| Single server instance | Simpler architecture, tools validate clientId | ✓ Good |
| list_clients discovery tool | LLMs can find available clients | ✓ Good |
| Error messages hint discovery | Teaches LLM to use list_clients on error | ✓ Good |
| X-Client-ID deprecation warning | Graceful migration, visible to LLM | ✓ Good |

---
*Last updated: 2026-02-05 after v1.1 milestone complete*
