# External Integrations

**Analysis Date:** 2026-02-04

## APIs & External Services

**OneApp Business API (Core):**
- Base URL: `CORE_BASE_URL` environment variable (defaults to `https://api.oneapp.cl`)
- SDK/Client: Native `fetch` API via `httpJson()` helper in `src/oneappServer.ts`
- Auth: `Authorization` header (bearer token or API key) + `client` header
- Endpoints:
  - `/core/sucursales` - List branches
  - `/core/zonas` - List zones with optional filtering
  - `/core/subgerencias` - List submanagements
  - `/core/subgerencias/{id}/zonas` - Get zones by submanagement
  - `/core/zonas/{zone_id}/sucursales` - Get branches by zone
  - `/visual/area` - List visual areas
  - `/visual/category` - List visual categories
  - `/visual/category/areas` - Get categories by areas
  - `/visual/reason` - List visual evaluation criteria
  - `/visual/reason/categories` - Get evaluation criteria by categories
  - `/visual/moai` - MoAI visual photo submission (POST/GET)

**OneApp Business API (Client):**
- Base URL: `CLIENT_BASE_URL` environment variable (defaults to `https://sechpos.oneapp.cl`)
- SDK/Client: Native `fetch` API via `httpJson()` helper in `src/oneappServer.ts`
- Auth: `Authorization` header (bearer token or API key) + `client` header
- Endpoints:
  - `/front/api/checklist/data/checks` - List active checklists with pagination
  - `/front/api/checklist/data/ambitos` - Get checklist scopes
  - `/front/api/checklist/data/preguntas` - Get checklist questions
  - `/front/api/checklist/data/cuestionarios` - List executed questionnaires by date range
  - `/front/api/checklist/data/asignaciones` - Get questionnaire assignments
  - `/front/api/checklist/data/respuestas` - Get assignment responses

## Data Storage

**Databases:**
- Not applicable - This is a read-only proxy/gateway service

**File Storage:**
- Not used - No file storage integration detected

**Caching:**
- In-memory server caching: MCP server instance cached in `netlify/functions/mcp.ts`
- Cache invalidation: Based on environment variable changes (hash-based)
- No external cache service (Redis, Memcached, etc.)

## Authentication & Identity

**Auth Provider:**
- Custom header-based authentication (external API provider)
- Implementation:
  - `Authorization` header: Passes `AUTHORIZATION` env var as-is (supports Bearer tokens or API keys)
  - `client` header: Passes `CLIENT_HEADER` env var for tenant/customer identification
  - No built-in OAuth, JWT validation, or session management
  - Authentication is delegated to OneApp API endpoints

**Session Management:**
- MCP-specific: `mcp-session-id` header manages MCP protocol sessions
- Sessions stored in-memory in `netlify/functions/mcp.ts` transports map
- Sessions auto-cleanup on transport close
- No persistent session storage

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service integrated

**Logs:**
- Console logging only (Node.js `console` API)
- Log locations in code:
  - `src/oneappServer.ts`: HTTP error responses logged with status, headers, body
  - `netlify/functions/mcp.ts`: Request failures and error messages logged
- No structured logging framework or log aggregation service

## CI/CD & Deployment

**Hosting:**
- Netlify Functions (serverless)
- Static files: Served from `public/` directory

**CI Pipeline:**
- Netlify built-in CI/CD
- Build command: `npm run build` (TypeScript compilation)
- Automatic deployment on git push
- Conditional builds: Ignore rule in `netlify.toml` uses `git diff` to skip builds on no changes

**Build Output:**
- Source: `src/`, `netlify/`
- Compiled to: `dist/`
- Functions deployed from: `dist/netlify/functions`
- Functions executed from: `/mcp` endpoint (path defined in `netlify/functions/mcp.ts`)

## Environment Configuration

**Required env vars:**
- `CORE_BASE_URL` - OneApp core API base URL
- `CLIENT_BASE_URL` - OneApp client API base URL
- `AUTHORIZATION` - API authentication token/key
- `CLIENT_HEADER` - Client/tenant identifier

**Optional env vars:**
- `HTTP_TIMEOUT_MS` - Request timeout (default: 30000ms)
- `NODE_ENV` - Environment mode (development/production, affects dotenv loading)

**Secrets location:**
- Development: `.env` file (git-ignored, loaded via dotenv)
- Production: Netlify environment variables in dashboard
- No secret rotation or key management service detected

## Webhooks & Callbacks

**Incoming:**
- MCP protocol endpoints: `POST /mcp` - Receives JSON-RPC 2.0 requests
- Session header: `mcp-session-id` used for session correlation
- Request format: JSON-RPC 2.0 with method, params, id

**Outgoing:**
- None detected - This is a read-only gateway
- All OneApp API interactions are request-response (no webhooks/callbacks)

## Service-to-Service Communication

**MCP Transport:**
- Protocol: Streamable HTTP (JSON-RPC 2.0 over HTTP POST)
- Implementation: `@modelcontextprotocol/sdk/server/streamableHttp.js`
- Transport bridge: `fetch-to-node` converts Fetch API to Node.js req/res
- Compatible with any MCP client that supports HTTP transport

**HTTP Client:**
- Built-in: Fetch API (Node.js 20.x has native fetch)
- Timeout handling: AbortController with configurable timeout
- Error handling: Non-200 responses throw with error details
- Headers management: Custom headers for auth and content-type

---

*Integration audit: 2026-02-04*
