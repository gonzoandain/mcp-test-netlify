# OneApp MCP Server - Multi-tenant

## What This Is

A Netlify-hosted MCP (Model Context Protocol) server that proxies API requests to OneApp's Core and Client APIs. Currently serves a single client via hardcoded env vars. This project adds multi-tenant support so one deployment can serve multiple clients, each with their own API credentials.

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

### Active

- [ ] Parse X-Client-ID header from incoming requests
- [ ] Load client configs from CLIENTS_CONFIG env var (JSON)
- [ ] Look up client config by ID on each request
- [ ] Return 400 error for missing or unknown client ID
- [ ] Cache separate MCP server per client (not one global cache)
- [ ] Pass client config to oneappServer instead of reading env vars

### Out of Scope

- External database for client configs — keep it simple with env var
- Subdomain or path-based routing — header-based is cleaner
- Default client fallback — explicit errors prevent silent misrouting
- Client config hot-reload — requires redeploy to update configs

## Context

The server currently reads 4 env vars at startup: CORE_BASE_URL, CLIENT_BASE_URL, AUTHORIZATION, CLIENT_HEADER. To switch clients, you manually change these in Netlify dashboard — tedious and error-prone with multiple clients.

Client configs live in a markdown file outside this repo (for security). The JSON version will be copy-pasted into Netlify's CLIENTS_CONFIG env var.

The MCP server is currently cached globally in mcp.ts with an env hash for invalidation. Multi-tenancy requires caching per client ID instead.

## Constraints

- **Platform**: Netlify Functions — no long-running server, stateless between cold starts
- **Config source**: Netlify env vars only — no external config service
- **Protocol**: MCP over HTTP POST to /mcp endpoint

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| X-Client-ID header for client identification | Clean, doesn't pollute URL, standard practice | — Pending |
| JSON env var for all configs | Simple, no external dependencies, secrets stay in Netlify | — Pending |
| Per-client server caching | Reuse MCP server across requests for same client | — Pending |
| 400 error for invalid client | Explicit failure prevents silent misrouting | — Pending |

---
*Last updated: 2026-02-04 after initialization*
