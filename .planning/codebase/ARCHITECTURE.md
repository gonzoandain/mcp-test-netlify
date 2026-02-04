# Architecture

**Analysis Date:** 2026-02-04

## Pattern Overview

**Overall:** Serverless MCP (Model Context Protocol) Server via Netlify Functions

**Key Characteristics:**
- Event-driven serverless architecture using Netlify Functions
- MCP protocol implementation for AI agent interactions
- HTTP-based communication with session management
- Server initialization caching across function invocations
- External API aggregation layer

## Layers

**Transport Layer:**
- Purpose: Handle HTTP protocol communication and session management
- Location: `netlify/functions/mcp.ts`
- Contains: Request/response handling, session lifecycle management, MCP transport configuration
- Depends on: `@modelcontextprotocol/sdk`, `fetch-to-node`, Netlify Functions runtime
- Used by: HTTP clients making MCP requests

**Server Layer:**
- Purpose: Define MCP tools and handle tool invocations
- Location: `src/oneappServer.ts`
- Contains: Tool definitions, HTTP client abstraction, API integration logic
- Depends on: `@modelcontextprotocol/sdk`, `zod` for validation, external APIs (CORE_BASE, CLIENT_BASE)
- Used by: Transport layer for processing tool calls

**HTTP Client Abstraction:**
- Purpose: Unified interface for external API communication
- Location: `src/oneappServer.ts` (function `httpJson`)
- Contains: Header management, authentication, timeout handling, error transformation
- Depends on: Fetch API, environment variables for auth credentials
- Used by: All tool implementations

## Data Flow

**Request Initialization:**

1. HTTP POST arrives at `/mcp` endpoint (Netlify Function)
2. Netlify converts Web Request to Node.js req/res objects via `toReqRes`
3. Handler checks for session ID in `mcp-session-id` header
4. If new initialization: create StreamableHTTPServerTransport, connect server
5. If existing session: reuse cached transport
6. Handler routes request through transport to McpServer

**Tool Invocation:**

1. Client sends JSON-RPC request with tool name and parameters
2. Transport passes to McpServer
3. Server matches tool definition (from `buildOneAppServer()`)
4. Tool handler validates parameters via Zod schema
5. Handler calls `httpJson()` with constructed URL and options
6. Response parsed, formatted as MCP content, returned to client

**Session Management:**

1. Transport stores session by ID in `transports` map (closure-scoped)
2. On session close: transport cleanup handler removes session reference
3. Across invocations: Netlify keeps function "warm", cache persists
4. Environment hash compared to detect config changes, invalidates cache if needed

## Key Abstractions

**McpServer:**
- Purpose: Central MCP protocol handler for tool registration and invocation
- Examples: `buildOneAppServer()` in `src/oneappServer.ts`
- Pattern: Factory function returns configured server instance with pre-registered tools

**Tool Definition:**
- Purpose: Represent callable operations available to AI agents
- Examples: `core_list_sucursales`, `checklist_list_checks`, `visual_areas`, `moai_visapp_foto`
- Pattern: Each tool declares schema (Zod type), description, async handler function

**StreamableHTTPServerTransport:**
- Purpose: Bridge between HTTP and MCP protocol, manage session lifecycle
- Examples: Instantiated in `netlify/functions/mcp.ts`
- Pattern: Web-standard Request/Response adapted to Node.js stream-based transport

**HTTP Client (`httpJson`):**
- Purpose: Standardize external API calls with auth, timeouts, error handling
- Examples: Called by every tool handler in `src/oneappServer.ts`
- Pattern: Generic async function with URL construction, header injection, timeout management

## Entry Points

**Netlify Function Handler:**
- Location: `netlify/functions/mcp.ts` (default export)
- Triggers: HTTP POST requests to `/.netlify/functions/mcp` (mapped to `/mcp` by config)
- Responsibilities: Protocol conversion (Web→Node), session routing, error handling
- Returns: JSON-RPC responses wrapped in HTTP 200/500

**Server Factory:**
- Location: `src/oneappServer.ts` (exported `buildOneAppServer()`)
- Triggers: Called once per function warm-start, cached with env hash
- Responsibilities: Tool registration, API client configuration
- Returns: Configured McpServer instance

**Static Content:**
- Location: `public/index.html`
- Triggers: HTTP GET to site root
- Responsibilities: Documentation and deployment instructions

## Error Handling

**Strategy:** Graceful degradation with JSON-RPC error responses

**Patterns:**
- HTTP errors caught in `httpJson()`: status codes logged, error details included in thrown Error
- Request timeouts: AbortController timeout converted to descriptive error message
- Malformed JSON-RPC: Handler wraps in `JSONRPCError` with -32603 code
- Session errors: Transport cleanup prevents stale session leaks
- Env variable validation: Logged at startup, missing vars use defaults (empty string)

## Cross-Cutting Concerns

**Logging:**
- Console-based (dev env only for env var status)
- Error logging via console.error() in `httpJson()` with full response details
- Request failure logging in tool handlers

**Validation:**
- Zod schemas for all tool parameters (number, string, array types)
- Date format validation via regex (`YYYY-MM-DD`)
- Integer range constraints (page, limit min/max)

**Authentication:**
- Environment variables: `AUTHORIZATION`, `CLIENT_HEADER` headers
- Headers injected by `httpJson()` for all requests
- Per-API base URL configuration: `CORE_BASE_URL`, `CLIENT_BASE_URL`

**Timeout Management:**
- Configurable via `HTTP_TIMEOUT_MS` env var (default 30000ms)
- AbortController pattern for request cancellation

---

*Architecture analysis: 2026-02-04*
