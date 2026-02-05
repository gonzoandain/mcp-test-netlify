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
- ✓ Parse X-Client-ID header from incoming requests — v1
- ✓ Load client configs from CLIENTS_CONFIG env var (JSON) — v1
- ✓ Look up client config by ID on each request — v1
- ✓ Return 403 error for missing or unknown client ID — v1
- ✓ Cache separate MCP server per client (not one global cache) — v1
- ✓ Pass client config to oneappServer instead of reading env vars — v1

### Active

(None — ready for next milestone)

### Out of Scope

- External database for client configs — keep it simple with env var
- Subdomain or path-based routing — header-based is cleaner
- Default client fallback — explicit errors prevent silent misrouting
- Client config hot-reload — requires redeploy to update configs

## Context

Shipped v1 with 942 LOC TypeScript. Multi-tenant routing fully operational.
Tech stack: Netlify Functions, MCP SDK, TypeScript.

Client configs stored in CLIENTS_CONFIG JSON env var. Each client gets isolated MCP server instance with 5-minute TTL cache.

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

---
*Last updated: 2026-02-04 after v1 milestone*
