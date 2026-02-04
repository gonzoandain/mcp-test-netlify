# Coding Conventions

**Analysis Date:** 2026-02-04

## Naming Patterns

**Files:**
- Kebab-case for function files: `mcp.ts`, `test.ts` in `/netlify/functions/`
- CamelCase for service/utility files: `oneappServer.ts` in `/src/`
- No suffixes like `.service.ts` or `.util.ts` used

**Functions:**
- camelCase for all function names: `buildOneAppServer()`, `getServer()`, `httpJson<T>()`
- Private/internal functions use camelCase: `getServer()`, `httpJson()`
- Exported functions use camelCase: `buildOneAppServer()`
- Handler functions named descriptively: `handler()` for Netlify function exports

**Variables:**
- camelCase for all variable declarations
- SCREAMING_SNAKE_CASE for constants: `CORE_BASE`, `CLIENT_BASE`, `AUTHORIZATION`, `CLIENT_HEADER`, `HTTP_TIMEOUT_MS`
- Descriptive names for object keys in URLSearchParams and request objects
- Prefix `cached` for module-level cached values: `cached`, `cachedEnvHash`
- Prefix `transport` for connection objects: `transport`

**Types:**
- Generic type parameters in angle brackets: `httpJson<T>()`, `httpJson<any>`
- Type annotations inline in parameter lists: `req: Request`, `path: string`
- No explicit type aliases (.ts files use inline types)
- JSDoc-style types using `satisfies` keyword: `satisfies JSONRPCError`

**Tool Definitions:**
- snake_case for MCP tool names: `core_list_sucursales`, `checklist_list_checks`, `visual_areas`, `moai_visapp_foto`
- Organized by domain prefix: `core_*`, `checklist_*`, `visual_*`, `moai_*`
- Parameter schema validation using zod: `z.number().int()`, `z.string().optional()`, `z.array()`

## Code Style

**Formatting:**
- No explicit linter/formatter configuration detected
- 2-space indentation observed (TypeScript/JavaScript default)
- Comments use `//` for single-line and `/* */` for multi-line
- JSDoc comments on functions and exported items

**Linting:**
- No ESLint or Prettier configuration found
- TypeScript strict mode enabled: `"strict": true` in `tsconfig.json`
- Compiler flags: `forceConsistentCasingInFileNames`, `skipLibCheck`, `esModuleInterop`

**Import Style:**
- ES module syntax with `.js` file extensions in relative imports (required for ES modules)
- Named imports from packages: `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'`
- Type imports: `import type { JSONRPCError } from '@modelcontextprotocol/sdk/types.js'`
- Dynamic imports for development-only dependencies: `await import('dotenv')`

## Import Organization

**Order:**
1. External package imports (node:* first, then @organization/*, then regular packages)
2. Type imports from external packages
3. Relative imports from same project (`../../src/oneappServer.js`)
4. Export/config statements at bottom

**Example from `netlify/functions/mcp.ts`:**
```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { toFetchResponse, toReqRes } from 'fetch-to-node';
import type { JSONRPCError } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { buildOneAppServer } from '../../src/oneappServer.js';
```

**Path Aliases:**
- No path aliases configured (uses relative paths)

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: `try { ... } catch (error) { ... }`
- Error type narrowing: `error instanceof Error` to check error type
- Specific error checking for timeout: `error.name === 'AbortError'`
- Console.error() for logging errors before re-throwing
- JSON-RPC error format for HTTP responses: `{ jsonrpc: '2.0', error: { code, message }, id }`
- Graceful fallback when error details unavailable: `err instanceof Error ? err.message : String(err)`

**Error Response Patterns:**
```typescript
try {
  // operation
} catch (err) {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32603, message: `Internal server error: ${err instanceof Error ? err.message : String(err)}` },
      id: requestId,
    } satisfies JSONRPCError),
    { status: 500, headers: { 'Content-Type': 'application/json' } },
  );
}
```

## Logging

**Framework:** Built-in `console` object

**Patterns:**
- `console.log()` for startup information and status messages
- `console.error()` for error conditions and debugging
- Development-only logging behind `process.env.NODE_ENV !== 'production'` check
- Structured logging with descriptive messages: `'Development: Loading .env file -'`, `'Request failed:'`
- Header inspection logged: `Object.fromEntries(response.headers.entries())`
- Environment variable status masked: `[SET]` or `[NOT SET]` instead of showing values

**Example from `src/oneappServer.ts`:**
```typescript
if (process.env.NODE_ENV !== 'production') {
  console.log('Environment variables loaded:');
  console.log('- CORE_BASE_URL:', process.env.CORE_BASE_URL ? '[SET]' : '[NOT SET]');
}
```

## Comments

**When to Comment:**
- File-level comments describing purpose: `// netlify/functions/mcp.ts`
- JSDoc comments on exported functions explaining parameters and purpose
- Inline comments for non-obvious logic or workarounds
- Comments explaining "why" rather than "what"

**Comment Examples:**
```typescript
/** Cache the server across invocations (Netlify keeps the function "warm") */
let cached: McpServer | null = null;

/**
 * Netlify function handler — all MCP traffic is POSTed here
 */
export default async function handler(req: Request): Promise<Response>

// Reuse existing transport for this session
transport = transports[sessionId];
```

**JSDoc/TSDoc:**
- Used for exported functions and public APIs
- Parameter descriptions using `@param`
- Return type documentation
- Single-line JSDoc for simple functions

## Function Design

**Size:** Functions average 20-50 lines; largest is ~130 lines (handler function with multiple branches)

**Parameters:**
- Inline type annotations: `req: Request`, `path: string`
- Destructured object parameters: `({ zone_id })` for zod schema parameters
- Generic type parameters for reusable functions: `httpJson<T>()`

**Return Values:**
- Explicit return type annotations: `Promise<Response>`, `Promise<T>`
- Consistent return format for tool callbacks: `{ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }`
- Error objects wrapped in JSON-RPC format

**Example:**
```typescript
async function httpJson<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  // implementation
  return response.json();
}

server.tool('tool_name', 'description', async () => {
  try {
    const data = await httpJson<any>(CORE_BASE, '/path', { method: 'GET' });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
});
```

## Module Design

**Exports:**
- Default export for Netlify function handlers: `export default async function handler()`
- Named exports for reusable functions: `export function buildOneAppServer()`
- Config objects exported as named exports: `export const config = { path: '/mcp' }`

**Module Structure:**
- Single entry point per Netlify function
- Shared server logic in `src/oneappServer.ts`
- Server builder pattern used: `buildOneAppServer()` returns configured server
- Module-level state for caching: `let cached: McpServer | null = null`

---

*Convention analysis: 2026-02-04*
