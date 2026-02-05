# Phase 3: Tool Parameters and Discovery - Research

**Researched:** 2026-02-05
**Domain:** MCP SDK tool definition, multi-tenant parameter injection, client discovery
**Confidence:** HIGH

## Summary

This phase transforms the MCP server from header-based client routing to parameter-based client selection. Every tool must accept `clientId` as a required first parameter, validate it against known clients, and use the corresponding config for API calls. Additionally, a new `list_clients` discovery tool allows LLMs to see available client IDs.

The existing codebase uses `@modelcontextprotocol/sdk` v1.2.0 with the `McpServer.tool()` method for tool registration. This method accepts a Zod schema object (`ZodRawShape`) for parameters, which automatically validates inputs before the handler runs. The current architecture creates one server per client (via `buildOneAppServer(config)`), but this phase shifts to a single server that resolves the client config at tool execution time based on the `clientId` parameter.

**Primary recommendation:** Refactor `buildOneAppServer()` to not receive config at construction time. Instead, each tool handler receives `clientId`, validates it, retrieves config via `getClientConfig()`, and executes. Create a `validateClientId()` helper that returns either the config or an error result.

## Standard Stack

This phase requires no new dependencies. All functionality uses existing libraries.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | ^1.2.0 | MCP server, tool registration | Already in use, provides `McpServer.tool()` API |
| zod | ^3.23.8 | Parameter schema validation | Required peer dep of MCP SDK, already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native Map | ES6+ | Config lookup | Already used in `clientsConfig` module |

### Not Using
| Library | Why Not |
|---------|---------|
| express-validator | Zod handles all validation via MCP SDK |
| joi | Zod is required by MCP SDK, no need for alternatives |

**Installation:** None required - all dependencies already present.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── config.ts          # (existing) clientsConfig, getClientConfig(), getClientIds()
├── types.ts           # (existing) ClientConfig, add ClientInfo type
├── tools/             # NEW: tool handlers organized by domain
│   ├── core.ts        # Core API tools (sucursales, zonas, etc.)
│   ├── checklist.ts   # Checklist API tools
│   ├── visual.ts      # Visual/Visapp tools
│   └── discovery.ts   # list_clients tool
├── httpClient.ts      # NEW: HTTP helper that accepts config (extracted from closure)
└── server.ts          # NEW: buildServer() creates single server, registers all tools

netlify/functions/
└── mcp.ts             # Simplified: creates ONE server, no per-client caching needed
```

### Pattern 1: clientId as First Required Parameter

**What:** Every tool schema includes `clientId` as the first required string parameter.

**When to use:** All existing tools and new tools.

**Example:**
```typescript
// Source: MCP SDK TypeScript definition (McpServer.tool signature)
import { z } from 'zod';

// Common schema for clientId parameter
const clientIdParam = {
  clientId: z.string().describe('Client identifier for multi-tenant routing')
};

// Tool with clientId as first parameter
server.tool(
  'core_list_sucursales',
  'Obtiene la lista completa de sucursales registradas para el cliente.',
  {
    clientId: z.string().describe('Client identifier'),
    // ... other params
  },
  async ({ clientId, ...otherParams }) => {
    // Validate and get config
    const configResult = validateClientId(clientId);
    if (!configResult.success) {
      return configResult.error;
    }
    const config = configResult.config;

    // Use config for API call
    const data = await httpJson(config, '/core/sucursales', { method: 'GET' });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);
```

### Pattern 2: Client Validation Helper

**What:** A helper function that validates clientId and returns either config or an error result.

**When to use:** At the start of every tool handler.

**Example:**
```typescript
// Source: MCP SDK docs - tool execution errors use isError: true
import { getClientConfig, getClientIds } from './config.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

type ValidationResult =
  | { success: true; config: ClientConfig }
  | { success: false; error: CallToolResult };

export function validateClientId(clientId: string): ValidationResult {
  const config = getClientConfig(clientId);

  if (!config) {
    const availableClients = getClientIds().join(', ');
    return {
      success: false,
      error: {
        content: [{
          type: 'text',
          text: `Unknown client ID: "${clientId}". Available clients: ${availableClients}`
        }],
        isError: true
      }
    };
  }

  return { success: true, config };
}
```

### Pattern 3: Discovery Tool

**What:** A `list_clients` tool that returns available client IDs with optional names/descriptions.

**When to use:** LLMs call this to discover which clientId values are valid.

**Example:**
```typescript
// Source: Requirements DISC-01, DISC-02
server.tool(
  'list_clients',
  'Returns available client IDs for use with other tools. Call this first to discover valid clientId values.',
  async () => {
    const clients = getClientList(); // Returns array of { id, name?, description? }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(clients, null, 2)
      }]
    };
  }
);
```

### Pattern 4: HTTP Client Extracted from Closure

**What:** The `httpJson` helper is extracted to accept config as parameter instead of capturing via closure.

**When to use:** All API calls in tool handlers.

**Example:**
```typescript
// Before (closure-based, in buildOneAppServer):
// const httpJson = async <T>(baseUrl: string, path: string, options = {}) => { ... }

// After (parameter-based, standalone module):
export async function httpJson<T>(
  config: ClientConfig,
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = new URL(path, baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (config.authorization) {
    headers['Authorization'] = config.authorization;
  }
  if (config.clientHeader) {
    headers['client'] = config.clientHeader;
  }

  // ... rest of implementation
}
```

### Anti-Patterns to Avoid

- **Creating server per client:** The old pattern of `buildOneAppServer(config)` creates separate server instances. With clientId in parameters, ONE server handles ALL clients.
- **Validating clientId in multiple places:** Centralize in `validateClientId()` helper.
- **Returning protocol errors for invalid clientId:** Use `isError: true` in tool result, not JSON-RPC error. This allows LLM to see the error and retry.
- **Forgetting to list available clients in error messages:** Always include valid client IDs in unknown client errors to help LLM self-correct.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parameter validation | Manual type checks | Zod schema in tool() | MCP SDK validates before handler runs |
| Error result format | Custom error objects | `{ content: [...], isError: true }` | MCP protocol standard |
| Client ID normalization | Manual string ops | `clientId.trim().toLowerCase()` | Already done in Phase 2 routing.ts |
| JSON Schema generation | Manual schema writing | Zod with z.describe() | SDK converts Zod to JSON Schema automatically |

**Key insight:** The MCP SDK's `tool()` method handles schema validation automatically. If parameters don't match the Zod schema, the handler never runs and the client receives a proper error. Focus on business logic errors (unknown clientId), not type validation.

## Common Pitfalls

### Pitfall 1: Returning Protocol Errors for Business Logic Failures

**What goes wrong:** Tool returns JSON-RPC error (-32602) for unknown clientId, LLM can't see the helpful message.

**Why it happens:** Confusing protocol errors (malformed request) with execution errors (valid request, invalid data).

**How to avoid:** Use `isError: true` in tool result for business logic errors like unknown client.

**Warning signs:** LLM keeps retrying with same invalid clientId, never learns available options.

### Pitfall 2: Forgetting clientId Parameter on Some Tools

**What goes wrong:** Some tools still work without clientId (using default or cached config), causing inconsistent behavior.

**Why it happens:** Incremental refactoring misses some tools.

**How to avoid:** Systematic refactor of ALL tools. Verify by checking tools/list output shows clientId in every schema.

**Warning signs:** Some tools work without clientId, others fail.

### Pitfall 3: Not Including Available Clients in Error Messages

**What goes wrong:** Error says "Unknown client ID: foo" but doesn't say what's valid.

**Why it happens:** Assuming user/LLM knows valid values.

**How to avoid:** Always include `getClientIds()` in unknown client error messages.

**Warning signs:** LLM can't self-correct after invalid clientId error.

### Pitfall 4: Still Requiring X-Client-ID Header

**What goes wrong:** Phase 3 adds clientId parameter but Phase 2 routing still requires header, so both are needed.

**Why it happens:** Header validation runs before tool execution.

**How to avoid:** In Phase 3, keep header routing working (backward compatibility). Phase 4 removes it. During Phase 3, tools can work with either header OR parameter.

**Warning signs:** Tools fail when header is missing, even with valid clientId parameter.

### Pitfall 5: Config Parsed Per Tool Call

**What goes wrong:** Performance degrades as each tool call re-parses CLIENTS_CONFIG.

**Why it happens:** Moving from server-construction-time config to tool-execution-time config, forgetting that config is already cached at module level.

**How to avoid:** Config is already loaded once in `config.ts`. Just call `getClientConfig(clientId)` - it's a Map lookup, not parsing.

**Warning signs:** Logs show "Decompressed CLIENTS_CONFIG" multiple times (should be once at startup).

## Code Examples

Verified patterns from official sources and existing codebase:

### Complete Tool Handler with clientId Validation

```typescript
// Source: MCP SDK docs + existing codebase pattern
import { z } from 'zod';
import { validateClientId } from './validation.js';
import { httpJson } from './httpClient.js';

// In server.ts or tools/core.ts
server.tool(
  'core_list_zonas',
  'Devuelve todas las zonas asociadas al cliente; permite filtrar por zone_id.',
  {
    clientId: z.string().describe('Client identifier for multi-tenant routing'),
    zone_id: z.number().int().optional().describe('ID de la zona')
  },
  async ({ clientId, zone_id }) => {
    // Step 1: Validate client
    const validation = validateClientId(clientId);
    if (!validation.success) {
      return validation.error;  // Returns { content: [...], isError: true }
    }
    const config = validation.config;

    // Step 2: Build request
    const qs = new URLSearchParams();
    if (typeof zone_id === 'number') qs.set('zone_id', String(zone_id));
    const path = '/core/zonas' + (qs.toString() ? `?${qs.toString()}` : '');

    // Step 3: Make API call with client's config
    const data = await httpJson<any>(config, config.coreBaseUrl, path, { method: 'GET' });

    // Step 4: Return result
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    };
  }
);
```

### list_clients Discovery Tool

```typescript
// Source: Requirements DISC-01, DISC-02
import { getClientIds, getClientConfig } from './config.js';

// Type for client info (extend ClientConfig in types.ts if needed)
interface ClientInfo {
  id: string;
  name?: string;
  description?: string;
}

function getClientList(): ClientInfo[] {
  return getClientIds().map(id => {
    const config = getClientConfig(id);
    // Future: could extend ClientConfig to include name/description
    return {
      id,
      // name: config?.name,  // Add to ClientConfig type if needed
      // description: config?.description
    };
  });
}

server.tool(
  'list_clients',
  'Returns available client IDs for use with other tools. Call this to discover valid clientId values before using other tools.',
  async () => {
    const clients = getClientList();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          clients,
          usage: 'Pass one of these client IDs as the clientId parameter to other tools'
        }, null, 2)
      }]
    };
  }
);
```

### validateClientId Implementation

```typescript
// Source: MCP SDK types, existing routing.ts error pattern
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getClientConfig, getClientIds } from './config.js';
import { ClientConfig } from './types.js';

type ClientValidationResult =
  | { success: true; config: ClientConfig }
  | { success: false; error: CallToolResult };

export function validateClientId(clientId: string): ClientValidationResult {
  // Normalize to match how config keys are stored
  const normalizedId = clientId.trim().toLowerCase();

  const config = getClientConfig(normalizedId);

  if (!config) {
    const availableClients = getClientIds();
    return {
      success: false,
      error: {
        content: [{
          type: 'text',
          text: `Unknown client ID: "${clientId}". Available clients: ${availableClients.join(', ')}.`
        }],
        isError: true
      }
    };
  }

  return { success: true, config };
}
```

### Refactored httpJson (Standalone Module)

```typescript
// Source: Extracted from existing oneappServer.ts
import { ClientConfig } from './types.js';

const DEFAULT_TIMEOUT_MS = 30000;

export async function httpJson<T>(
  config: ClientConfig,
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = new URL(path, baseUrl);
  const timeoutMs = config.httpTimeoutMs ?? DEFAULT_TIMEOUT_MS;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (config.authorization) {
    headers['Authorization'] = config.authorization;
  }
  if (config.clientHeader) {
    headers['client'] = config.clientHeader;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| X-Client-ID header routing | clientId as tool parameter | This phase | LLMs can use tools directly |
| Per-client server instances | Single server, per-call config | This phase | Simpler architecture, less memory |
| Config via closure | Config via parameter | This phase | Tools are stateless, testable |

**Deprecated/outdated:**
- `buildOneAppServer(config)`: Will be replaced by `buildServer()` (no config param)
- Per-client `serverCache`: Becomes unnecessary when one server handles all
- Header-based routing: Remains for backward compatibility until Phase 4

## Open Questions

Things that couldn't be fully resolved:

1. **Client Names/Descriptions in Config**
   - What we know: DISC-02 requires `list_clients` to include names when configured
   - What's unclear: Current `ClientConfig` doesn't have `name` or `description` fields
   - Recommendation: Extend `ClientConfig` type to include optional `name` and `description`. Update CLIENTS_CONFIG JSON format documentation.

2. **Backward Compatibility Period**
   - What we know: Phase 3 adds parameters, Phase 4 removes headers
   - What's unclear: During Phase 3, should tools require both header AND parameter?
   - Recommendation: During Phase 3, header routing still provides the client context. Tools with clientId parameter can work independently. Both paths should work.

3. **Tool Count Scaling**
   - What we know: Currently 15+ tools, all need clientId parameter
   - What's unclear: Best way to avoid repetitive validation code
   - Recommendation: Use `validateClientId()` helper in every handler. Consider a higher-order function wrapper in future if code becomes too repetitive.

## Sources

### Primary (HIGH confidence)
- MCP SDK TypeScript definitions (`node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts`) - Tool method signatures, ZodRawShape parameter schema
- [MCP Tools Documentation](https://modelcontextprotocol.io/docs/concepts/tools) - Error handling with `isError: true`, tool result format
- Existing codebase (`src/oneappServer.ts`, `src/config.ts`) - Current implementation patterns

### Secondary (MEDIUM confidence)
- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk) - Tool registration patterns
- [Error Handling in MCP Tools](https://apxml.com/courses/getting-started-model-context-protocol/chapter-3-implementing-tools-and-logic/error-handling-reporting) - isError field usage

### Tertiary (LOW confidence)
- WebSearch results on MCP best practices - Community patterns, general guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only existing dependencies, API verified in SDK types
- Architecture: HIGH - Patterns verified in MCP docs and existing codebase
- Pitfalls: HIGH - Common issues documented in MCP docs and GitHub issues

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable patterns, minor SDK updates possible)

---

*Phase: 03-tool-parameters-and-discovery*
*Research completed: 2026-02-05*
