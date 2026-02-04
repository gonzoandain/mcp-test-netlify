# Phase 2: Multi-tenant Routing - Research

**Researched:** 2026-02-04
**Domain:** HTTP header routing, in-memory caching with TTL, error response patterns
**Confidence:** HIGH

## Summary

This phase implements request routing based on the X-Client-ID header, per-client MCP server caching with TTL eviction, and structured JSON error responses. The research covers three main areas: header extraction and validation, TTL-based cache implementation using Map with setTimeout, and error response design.

The existing codebase already uses Netlify Functions v2 with Web API Request/Response objects, providing standard `headers.get()` for case-insensitive header access. The `clientsConfig` module (from Phase 1) provides the `getClientConfig()` function for client lookup.

**Primary recommendation:** Implement a cache module with Map storage, per-entry setTimeout timers with TTL reset on access, and a routing layer that validates headers before server retrieval.

## Standard Stack

This phase requires no new dependencies. All functionality is implemented with existing stack.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native Map | ES6+ | Cache storage | Built-in, zero overhead, perfect for key-value cache |
| Native setTimeout | Node.js | TTL eviction timers | Built-in, can be unref'd to not block process |
| Web API Headers | Fetch API | Header access | Already used by Netlify Functions v2, case-insensitive |

### Not Using
| Library | Why Not |
|---------|---------|
| lru-cache | No size limit needed (TTL handles cleanup per user decision) |
| @isaacs/ttlcache | Adds dependency for simple use case |
| node-cache | Overkill for module-scoped cache |

**Installation:** None required - all native APIs.

## Architecture Patterns

### Recommended Module Structure

```
src/
├── cache.ts           # ServerCache class with TTL management
├── routing.ts         # Header extraction, validation, error responses
├── config.ts          # (existing) getClientConfig()
├── types.ts           # (existing) ClientConfig, add error types
└── oneappServer.ts    # (existing) buildOneAppServer()

netlify/functions/
└── mcp.ts             # Updated to use routing layer
```

### Pattern 1: TTL Cache with Timer Reset

**What:** Map-based cache storing server instances with setTimeout timers that reset on each access.

**When to use:** Per-client server caching with idle timeout eviction.

**Example:**
```typescript
// Source: https://oneuptime.com/blog/post/2026-01-30-nodejs-memory-cache-ttl/view
interface CacheEntry<T> {
  value: T;
  timer: NodeJS.Timeout;
}

class ServerCache {
  private cache = new Map<string, CacheEntry<McpServer>>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  get(clientId: string): McpServer | undefined {
    const entry = this.cache.get(clientId);
    if (!entry) return undefined;

    // Reset TTL on access
    clearTimeout(entry.timer);
    entry.timer = this.createTimer(clientId);

    return entry.value;
  }

  set(clientId: string, server: McpServer): void {
    // Clear existing timer if any
    const existing = this.cache.get(clientId);
    if (existing) {
      clearTimeout(existing.timer);
    }

    this.cache.set(clientId, {
      value: server,
      timer: this.createTimer(clientId)
    });
  }

  private createTimer(clientId: string): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.cache.delete(clientId);
    }, this.ttlMs);

    // Don't block process exit
    timer.unref();
    return timer;
  }
}
```

### Pattern 2: Header Validation Pipeline

**What:** Extract, normalize, and validate X-Client-ID header in sequence.

**When to use:** Before routing to client-specific server.

**Example:**
```typescript
interface HeaderValidationResult {
  success: true;
  clientId: string;
} | {
  success: false;
  error: RoutingError;
}

function validateClientHeader(headers: Headers): HeaderValidationResult {
  // Headers.get() is case-insensitive per Web API spec
  const rawValue = headers.get('x-client-id');

  if (rawValue === null) {
    return {
      success: false,
      error: { code: 'MISSING_CLIENT_ID', message: 'Missing X-Client-ID header. Provide client identifier.' }
    };
  }

  // Check for comma (indicates duplicate headers combined by spec)
  if (rawValue.includes(',')) {
    return {
      success: false,
      error: { code: 'DUPLICATE_CLIENT_ID', message: 'Multiple X-Client-ID headers detected. Provide exactly one.' }
    };
  }

  // Trim and normalize
  const clientId = rawValue.trim().toLowerCase();

  // Validate alphanumeric only
  if (!/^[a-z0-9]+$/i.test(clientId)) {
    return {
      success: false,
      error: { code: 'INVALID_CLIENT_ID', message: 'Client ID must contain only alphanumeric characters.' }
    };
  }

  return { success: true, clientId };
}
```

### Pattern 3: Structured JSON Error Response

**What:** Consistent error format with machine-readable code and human-readable message.

**When to use:** All routing errors (missing header, unknown client, invalid format).

**Example:**
```typescript
interface RoutingError {
  code: string;
  message: string;
}

function createErrorResponse(error: RoutingError, status: number): Response {
  return new Response(
    JSON.stringify({
      error: error.message,
      code: error.code
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

### Anti-Patterns to Avoid

- **Per-request config parsing:** Config should be parsed at module load (already implemented in Phase 1).
- **Global server cache without client isolation:** Each client needs its own server instance with separate credentials.
- **setTimeout without clearTimeout:** Always clear existing timers before setting new ones to prevent memory leaks.
- **Case-sensitive header comparison:** Always use `headers.get()` which is case-insensitive per spec.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Case-insensitive headers | Manual lowercasing | `headers.get()` | Web API handles this correctly |
| Client ID normalization | String manipulation | `.trim().toLowerCase()` | Standard pattern, but don't forget both |
| Timer cleanup | Manual tracking | Store timer in cache entry | setTimeout returns reference for clearTimeout |

**Key insight:** The Web API Headers class already handles case-insensitivity. The main complexity is TTL reset on access and duplicate header detection.

## Common Pitfalls

### Pitfall 1: Forgetting to Reset TTL on Access

**What goes wrong:** Server instances evict even when actively used, causing unnecessary re-initialization.

**Why it happens:** TTL set only on creation, not refreshed on subsequent requests.

**How to avoid:** Call `clearTimeout(existing)` and create new timer on every `get()` call.

**Warning signs:** Logs show repeated server initialization for the same client.

### Pitfall 2: Timer Reference Memory Leak

**What goes wrong:** Old timers continue running after cache entries updated.

**Why it happens:** New timer created without clearing old one when `set()` called for existing key.

**How to avoid:** Always check for existing entry and `clearTimeout()` before creating new timer.

**Warning signs:** Memory slowly increasing, multiple evictions for same key.

### Pitfall 3: Duplicate Header Detection False Positives

**What goes wrong:** Legitimate client ID with comma (e.g., "a,b") rejected as duplicate.

**Why it happens:** Web API combines duplicate headers with comma separator.

**How to avoid:** User decision specifies alphanumeric only, so comma check is safe. Validate alphanumeric AFTER comma check.

**Warning signs:** Valid requests rejected with "duplicate header" error.

### Pitfall 4: Blocking Process Exit

**What goes wrong:** Node.js process won't exit because setTimeout timers are active.

**Why it happens:** Active timers keep event loop alive.

**How to avoid:** Call `timer.unref()` on all cache eviction timers.

**Warning signs:** Tests hang, deployment restarts take too long.

### Pitfall 5: Client ID Normalization Mismatch

**What goes wrong:** "ClientA" and "clienta" create separate cache entries.

**Why it happens:** Normalization not applied consistently between validation and cache lookup.

**How to avoid:** Normalize to lowercase once during validation, use normalized ID everywhere.

**Warning signs:** Same logical client gets different server instances.

## Code Examples

Verified patterns from official sources and established practices:

### Complete Routing Flow

```typescript
// Source: Combination of Web API spec and existing codebase patterns
import { getClientConfig } from './config.js';
import { buildOneAppServer } from './oneappServer.js';

const ERROR_CODES = {
  MISSING_CLIENT_ID: 'MISSING_CLIENT_ID',
  DUPLICATE_CLIENT_ID: 'DUPLICATE_CLIENT_ID',
  INVALID_CLIENT_ID: 'INVALID_CLIENT_ID',
  UNKNOWN_CLIENT: 'UNKNOWN_CLIENT',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

interface RoutingError {
  code: ErrorCode;
  message: string;
}

// Routing result types
type RoutingResult =
  | { success: true; clientId: string; server: McpServer }
  | { success: false; error: RoutingError; status: number };

export function routeRequest(
  headers: Headers,
  cache: ServerCache
): RoutingResult {
  // Step 1: Extract and validate header
  const validation = validateClientHeader(headers);
  if (!validation.success) {
    const status = validation.error.code === 'DUPLICATE_CLIENT_ID' ? 400 : 403;
    return { success: false, error: validation.error, status };
  }

  const { clientId } = validation;

  // Step 2: Check client exists in config
  const config = getClientConfig(clientId);
  if (!config) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.UNKNOWN_CLIENT,
        message: `Unknown client ID: ${clientId}. Check X-Client-ID header value.`
      },
      status: 403
    };
  }

  // Step 3: Get or create server (lazy init with cache)
  let server = cache.get(clientId);
  if (!server) {
    server = buildOneAppServer(config);
    cache.set(clientId, server);
  }

  return { success: true, clientId, server };
}
```

### Header Validation

```typescript
// Source: Web API Headers spec (MDN)
// headers.get() returns null if not present, string if present
// If multiple headers with same name, values are comma-separated

function validateClientHeader(headers: Headers): {
  success: true;
  clientId: string;
} | {
  success: false;
  error: RoutingError;
} {
  const rawValue = headers.get('x-client-id');

  // Missing header
  if (rawValue === null) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.MISSING_CLIENT_ID,
        message: 'Missing X-Client-ID header. Provide client identifier.'
      }
    };
  }

  // Duplicate headers (combined with comma per HTTP spec)
  if (rawValue.includes(',')) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.DUPLICATE_CLIENT_ID,
        message: 'Multiple X-Client-ID headers detected. Provide exactly one.'
      }
    };
  }

  // Normalize: trim whitespace, lowercase for case-insensitive matching
  const clientId = rawValue.trim().toLowerCase();

  // Empty after trim
  if (clientId === '') {
    return {
      success: false,
      error: {
        code: ERROR_CODES.MISSING_CLIENT_ID,
        message: 'X-Client-ID header is empty. Provide client identifier.'
      }
    };
  }

  // Alphanumeric only (per user decision)
  if (!/^[a-z0-9]+$/.test(clientId)) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_CLIENT_ID,
        message: 'Client ID must contain only alphanumeric characters (a-z, 0-9).'
      }
    };
  }

  return { success: true, clientId };
}
```

### ServerCache Class

```typescript
// Source: https://oneuptime.com/blog/post/2026-01-30-nodejs-memory-cache-ttl/view
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface CacheEntry {
  server: McpServer;
  timer: NodeJS.Timeout;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ServerCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get server for client, resetting TTL on access.
   * Returns undefined if not cached.
   */
  get(clientId: string): McpServer | undefined {
    const entry = this.cache.get(clientId);
    if (!entry) return undefined;

    // Reset TTL timer
    clearTimeout(entry.timer);
    entry.timer = this.createEvictionTimer(clientId);

    return entry.server;
  }

  /**
   * Cache server for client with TTL.
   * Replaces existing entry if present.
   */
  set(clientId: string, server: McpServer): void {
    // Clear existing timer if any
    const existing = this.cache.get(clientId);
    if (existing) {
      clearTimeout(existing.timer);
    }

    this.cache.set(clientId, {
      server,
      timer: this.createEvictionTimer(clientId)
    });
  }

  /**
   * Check if client has cached server.
   */
  has(clientId: string): boolean {
    return this.cache.has(clientId);
  }

  /**
   * Get number of cached servers (for testing/monitoring).
   */
  get size(): number {
    return this.cache.size;
  }

  private createEvictionTimer(clientId: string): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.cache.delete(clientId);
      // Optional: logging for monitoring
      // console.log(`Cache evicted: ${clientId}`);
    }, this.ttlMs);

    // Don't block Node.js process exit
    timer.unref();

    return timer;
  }
}

// Module-level singleton instance
export const serverCache = new ServerCache();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global server cache | Per-client cache with TTL | This phase | Enables multi-tenant with memory efficiency |
| Direct env var access | `getClientConfig()` lookup | Phase 1 | Clean separation, testable |
| Generic errors | Structured JSON with codes | This phase | Better debugging, client integration |

**Deprecated/outdated:**
- Global `cached` variable in mcp.ts: Will be replaced by per-client ServerCache
- `cachedEnvHash` pattern: No longer needed with per-client caching

## Open Questions

Things that couldn't be fully resolved:

1. **Transport Cache Interaction**
   - What we know: Current code caches transports by session ID (existing behavior)
   - What's unclear: Whether transports should also be client-scoped
   - Recommendation: Keep transport caching as-is (session-scoped), server caching is client-scoped

2. **Config Reload Behavior**
   - What we know: Config parsed at module load, cached servers persist
   - What's unclear: If CLIENTS_CONFIG changes, cached servers won't update until TTL expires
   - Recommendation: Accept this limitation - redeploy is the config change mechanism

## Sources

### Primary (HIGH confidence)
- MDN Web API Headers documentation - Case-insensitive header access, comma-separated duplicate handling
- Existing codebase (`netlify/functions/mcp.ts`, `src/config.ts`) - Function signatures, config access patterns

### Secondary (MEDIUM confidence)
- [OneUpTime Blog - Memory Cache with TTL](https://oneuptime.com/blog/post/2026-01-30-nodejs-memory-cache-ttl/view) - TTL cache patterns with setTimeout
- [Netlify Docs - Custom Headers](https://docs.netlify.com/manage/routing/headers/) - Header handling in Netlify

### Tertiary (LOW confidence)
- WebSearch results on duplicate header detection - Confirmed comma-separation behavior but implementation details vary

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only native APIs, no new dependencies
- Architecture: HIGH - Patterns well-established, verified with codebase
- Pitfalls: HIGH - Common issues documented, prevention strategies clear

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable patterns, no external dependencies)

---

*Phase: 02-multi-tenant-routing*
*Research completed: 2026-02-04*
