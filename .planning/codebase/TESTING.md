# Testing Patterns

**Analysis Date:** 2026-02-04

## Test Framework

**Runner:** Not detected

**Assertion Library:** Not detected

**Status:** No automated testing framework is configured in this project.

**Run Commands:** Not applicable - no test scripts defined in `package.json`

## Test File Organization

**Current State:** No test files exist in the codebase

**Location:** Not applicable

**Naming:** Not applicable

**Structure:** Not applicable

## Test Coverage

**Requirements:** Not enforced

**Current Coverage:** No test coverage (no tests present)

## Testing Approach

**Manual Testing Only:**

The project relies on manual testing through:

1. **MCP Inspector** - Official testing tool referenced in README
   - CLI tool: `@modelcontextprotocol/inspector` (mentioned but not in dependencies)
   - Usage: `mcp-inspector` command to connect and test server
   - Can inspect available tools via UI

2. **Local Development Server**
   - Run: `npm run dev` (from `package.json`)
   - Starts Netlify dev server at `http://localhost:8888/mcp`
   - Manual HTTP POST requests to test endpoints

3. **HTTP Client Testing**
   - Tools like curl, Postman, or similar can POST to endpoints
   - Must follow JSON-RPC protocol format
   - Requires proper `mcp-session-id` header for subsequent requests

## Manual Testing Patterns

**Initialization Flow:**
```
1. POST to /mcp with initialize request
2. Server returns session ID in response headers
3. Store session ID from response
4. Use session ID in `mcp-session-id` header for subsequent requests
```

**Request Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "mcp-inspector", "version": "1.0.0" }
  }
}
```

**Response Format:**
```json
{
  "jsonrpc": "2.0",
  "error": { "code": -32603, "message": "..." },
  "id": "request-id"
}
```

## Known Testing Gaps

**What's Not Tested:**
- `netlify/functions/mcp.ts` - Main Netlify function handler
  - Session management logic
  - Transport initialization
  - Error handling paths
  - Request routing

- `netlify/functions/test.ts` - Empty file, no implementation

- `src/oneappServer.ts` - Server configuration and all 15+ MCP tools
  - HTTP timeout handling
  - API integration with external services
  - Parameter validation (zod schemas)
  - Error response formatting
  - Cache invalidation logic

- Integration with external APIs
  - No mocks for Core API or Client API calls
  - No fixtures for API responses

**Critical Functions Without Tests:**
- `getServer()` - Cache management logic at `netlify/functions/mcp.ts:15`
- `httpJson<T>()` - HTTP request wrapper at `src/oneappServer.ts:32` (handles timeouts, auth)
- All 15+ tool handlers in `buildOneAppServer()` at `src/oneappServer.ts:87`

## Test Coverage by Area

**No coverage for:**
- Unit tests: 0%
- Integration tests: 0%
- E2E tests: 0%

## Recommendations for Testing

**Setup Priority:**

1. **Add Jest or Vitest**
   - Jest recommended for compatibility with Netlify Functions
   - Vitest for faster iteration during development
   - Config file: `jest.config.js` or `vitest.config.ts`

2. **Test File Structure (recommended)**
   ```
   netlify/functions/mcp.test.ts
   netlify/functions/test.test.ts
   src/oneappServer.test.ts
   src/__fixtures__/apiResponses.ts
   src/__fixtures__/mockServers.ts
   ```

3. **Core Tests to Add**
   - Handler function receives POST requests correctly
   - Session management creates and reuses transports
   - Error handling returns proper JSON-RPC error format
   - Environment variable loading and caching
   - Each MCP tool schema validation with zod
   - Timeout handling in httpJson<T>()
   - External API error propagation

4. **Mocking Strategy**
   - Mock `fetch()` for external API calls
   - Mock `McpServer` and `StreamableHTTPServerTransport` from SDK
   - Use test fixtures for API response data
   - Mock `process.env` for configuration testing

**Example Test Structure (for `httpJson<T>()`):**
```typescript
describe('httpJson', () => {
  it('should make authenticated GET request', async () => {
    // Test case
  });

  it('should timeout after HTTP_TIMEOUT_MS', async () => {
    // Test case
  });

  it('should include Authorization header when set', async () => {
    // Test case
  });

  it('should throw on HTTP error status', async () => {
    // Test case
  });
});
```

---

*Testing analysis: 2026-02-04*
