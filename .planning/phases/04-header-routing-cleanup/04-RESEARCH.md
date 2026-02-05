# Phase 4: Header Routing Cleanup - Research

**Researched:** 2026-02-05
**Domain:** Legacy code removal, MCP response patterns, deprecation warnings
**Confidence:** HIGH

## Summary

This phase removes legacy header-based routing infrastructure (routing.ts, cache.ts) that became obsolete after Phase 3 implemented clientId as a tool parameter. The research covers three areas: (1) safe file deletion patterns for TypeScript projects, (2) MCP response format for deprecation warnings, and (3) import cleanup patterns.

The codebase is already in a clean state for deletion. Phase 3 removed all imports of routing.ts and cache.ts from mcp.ts. The files exist but are unused. Validation.ts has a comment referencing routing.ts but no actual import. The routing.ts and cache.ts files can be safely deleted with minimal impact.

**Primary recommendation:** Delete routing.ts and cache.ts directly, update validation.ts comment, add header deprecation warning to mcp.ts request handler, update README.

## Standard Stack

No new libraries required. This is a deletion/cleanup phase using existing codebase patterns.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | ^1.2.0 | MCP server and types | Already in project |
| zod | ^3.x | Schema validation | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | No new libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| N/A | N/A | No alternatives - cleanup phase |

## Architecture Patterns

### Current Project Structure (Before Cleanup)
```
src/
├── cache.ts           # TO DELETE - TTL-based server cache (unused)
├── routing.ts         # TO DELETE - Header validation (unused)
├── config.ts          # KEEP - Client configuration loading
├── validation.ts      # UPDATE - Has comment referencing routing.ts
├── types.ts           # KEEP - Type definitions
├── httpClient.ts      # KEEP - HTTP client utilities
└── oneappServer.ts    # KEEP - MCP server with tools
```

### Target Project Structure (After Cleanup)
```
src/
├── config.ts          # Client configuration loading
├── validation.ts      # clientId validation (comment updated)
├── types.ts           # Type definitions
├── httpClient.ts      # HTTP client utilities
└── oneappServer.ts    # MCP server with tools
```

### Pattern 1: Deprecation Warning in MCP Response
**What:** Include deprecation warning when X-Client-ID header is present.
**When to use:** When legacy header is detected in request.
**How it works:** Check for header, log to console AND include warning in response content.

```typescript
// Source: MCP spec (modelcontextprotocol.io/specification/2025-06-18/server/tools)
// Warnings can be included as additional text content items in the response

// In mcp.ts request handler, before processing:
const deprecationWarning = req.headers.get('x-client-id')
  ? 'Warning: X-Client-ID header is deprecated'
  : null;

if (deprecationWarning) {
  console.warn(deprecationWarning);
}

// For tool responses, warning would be prepended to content array
// This is handled at tool level since mcp.ts doesn't directly construct tool responses
```

### Pattern 2: Tool-Level Deprecation Warning
**What:** Return deprecation warning as part of tool response when header detected.
**When to use:** When X-Client-ID header is present on incoming request.
**How it works:** Store header presence in request context, include warning in tool result.

```typescript
// Source: MCP SDK CallToolResult type
// Tool results contain content array with TextContent items

// Option A: Prepend warning to tool response content
const result = {
  content: [
    ...(headerDeprecated ? [{
      type: 'text' as const,
      text: 'Warning: X-Client-ID header is deprecated'
    }] : []),
    { type: 'text' as const, text: JSON.stringify(data, null, 2) }
  ]
};

// Option B: Use _meta field for metadata (protocol-reserved)
// Not recommended for warnings - _meta has format constraints
```

### Pattern 3: Safe File Deletion
**What:** Delete files only after verifying no imports reference them.
**When to use:** When removing legacy modules.
**How it works:** Grep for imports, verify compilation, then delete.

```bash
# Verification before deletion
grep -r "from.*routing" src/
grep -r "from.*cache" src/
grep -r "from.*routing" netlify/

# If no imports found, safe to delete
rm src/routing.ts src/cache.ts

# Verify TypeScript still compiles
npx tsc --noEmit
```

### Anti-Patterns to Avoid
- **Deleting files without verifying no imports**: Always grep for imports first
- **Keeping dead code "just in case"**: Bloats codebase, confuses future developers
- **Silently ignoring deprecated headers**: Users won't know to migrate
- **Rejecting requests with deprecated headers**: Breaks existing integrations

## Don't Hand-Roll

This phase is primarily deletion. No new components to build.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deprecation logging | Custom logging framework | console.warn | Already sufficient for warnings |
| Response modification | Middleware layer | Direct content array manipulation | MCP SDK handles response formatting |

**Key insight:** MCP tool responses use a simple content array pattern. Warnings are just additional TextContent items.

## Common Pitfalls

### Pitfall 1: Breaking TypeScript Compilation
**What goes wrong:** Deleting files that are still imported breaks compilation.
**Why it happens:** Imports not verified before deletion.
**How to avoid:** Run grep for imports, then run `npx tsc --noEmit` before committing.
**Warning signs:** TypeScript errors about missing modules.

### Pitfall 2: Orphaned Comments/References
**What goes wrong:** Comments reference deleted files, causing confusion.
**Why it happens:** Comments not updated when code is deleted.
**How to avoid:** Search for file names in comments, update or remove references.
**Warning signs:** Comments mentioning files that no longer exist.

### Pitfall 3: Missing Deprecation Path
**What goes wrong:** Removing functionality without warning breaks integrations.
**Why it happens:** Clean cut without transition period.
**How to avoid:** Per CONTEXT.md: log deprecation warning, return warning in response.
**Warning signs:** Support requests about "suddenly broken" integrations.

### Pitfall 4: Incorrect Error Message Updates
**What goes wrong:** Validation error messages don't match new approach.
**Why it happens:** Error messages written for header-based routing, not tool parameters.
**How to avoid:** Per CONTEXT.md: use "clientId required" and "Use list_clients to see available clients".
**Warning signs:** Error messages mentioning X-Client-ID when tools use clientId parameter.

## Code Examples

### Deprecation Warning Check in mcp.ts
```typescript
// Source: CONTEXT.md decision - log warning and return in response
// Location: netlify/functions/mcp.ts, early in handler function

export default async function handler(req: Request): Promise<Response> {
  // Check for deprecated header
  const clientIdHeader = req.headers.get('x-client-id');
  if (clientIdHeader) {
    console.warn('X-Client-ID header is deprecated');
  }

  // ... rest of handler
}
```

### Updated validation.ts Error Messages
```typescript
// Source: CONTEXT.md decision - generic message with hint
// Location: src/validation.ts

export function validateClientId(clientId: string): ClientValidationResult {
  const normalized = clientId.trim().toLowerCase();

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      success: false,
      error: 'clientId required. Use list_clients to see available clients',
    };
  }

  const config = getClientConfig(normalized);
  if (!config) {
    return {
      success: false,
      error: 'clientId required. Use list_clients to see available clients',
    };
  }

  return { success: true, config };
}
```

### File Deletion Commands
```bash
# After verification that no imports exist:
rm /Users/gonzo/Projects/andain/mcp/mcp-test-netlify/src/routing.ts
rm /Users/gonzo/Projects/andain/mcp/mcp-test-netlify/src/cache.ts

# Verify build still works:
cd /Users/gonzo/Projects/andain/mcp/mcp-test-netlify && npx tsc --noEmit
```

### README Update Pattern
```markdown
## Usage

All tools accept a `clientId` parameter to identify which client configuration to use.
Use the `list_clients` tool to discover available clients.

### Example Tool Call
```json
{
  "method": "tools/call",
  "params": {
    "name": "core_list_sucursales",
    "arguments": {
      "clientId": "sechpos"
    }
  }
}
```
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| X-Client-ID header routing | clientId as tool parameter | Phase 3 | LLMs can switch clients without reconnection |
| Per-client server caching | Single shared server | Phase 3 | Simpler architecture, lower memory |
| Header validation in mcp.ts | Tool-level validation | Phase 3 | Tools are self-contained |

**Deprecated/outdated:**
- routing.ts: Replaced by validation.ts for clientId validation
- cache.ts: Replaced by single server instance pattern

## Current Codebase State

### Files to Delete
| File | Lines | Purpose | Why Safe to Delete |
|------|-------|---------|-------------------|
| src/routing.ts | 144 | Header validation | Not imported anywhere (verified by grep) |
| src/cache.ts | 129 | Per-client server cache | Not imported anywhere (verified by grep) |

### Files to Update
| File | Change | Reason |
|------|--------|--------|
| src/validation.ts | Update comment line 20 | References "routing.ts pattern" |
| src/validation.ts | Update error messages | Per CONTEXT.md decision |
| netlify/functions/mcp.ts | Add deprecation warning | Per CONTEXT.md decision |
| README.md | Update usage instructions | Remove header docs |

### Files Unchanged
- src/config.ts - No references to deleted files
- src/types.ts - No references to deleted files
- src/httpClient.ts - No references to deleted files
- src/oneappServer.ts - No references to deleted files

## MCP Response Format for Warnings

Per MCP specification (2025-06-18), tool responses support:

1. **content**: Array of ContentBlock items (text, image, audio, resource)
2. **structuredContent**: Optional JSON object for structured results
3. **isError**: Boolean flag for tool execution errors

**Deprecation warnings should be:**
- Added as a TextContent item in the content array
- Placed before the main response data
- Not set as isError (the tool succeeded, we're just warning)

```typescript
// Example tool response with deprecation warning
{
  content: [
    { type: 'text', text: 'Warning: X-Client-ID header is deprecated' },
    { type: 'text', text: JSON.stringify(actualData, null, 2) }
  ],
  isError: false
}
```

## Open Questions

No significant open questions. The phase scope is well-defined:

1. **How to pass header presence to tools?** - Could use request context or handle at mcp.ts level before tool dispatch. Recommend: mcp.ts logs warning, tool responses don't need modification since tools work via clientId parameter now.

2. **Should validation.ts error messages change?** - Per CONTEXT.md: yes, use generic "clientId required" message with hint. This is a locked decision.

## Sources

### Primary (HIGH confidence)
- MCP Specification 2025-06-18 - https://modelcontextprotocol.io/specification/2025-06-18/basic - Tool response format, _meta field
- MCP Tools Specification - https://modelcontextprotocol.io/specification/2025-06-18/server/tools - CallToolResult structure
- Codebase analysis - Direct file reads of src/*.ts and netlify/functions/*.ts

### Secondary (MEDIUM confidence)
- TypeScript cleanup patterns - https://dev.to/dgreene1/how-to-properly-deprecate-3027 - Deprecation best practices

### Tertiary (LOW confidence)
- None required for this phase

## Metadata

**Confidence breakdown:**
- File deletion safety: HIGH - Verified via grep, no imports found
- MCP response format: HIGH - Official spec documentation
- Error message updates: HIGH - Locked in CONTEXT.md
- Deprecation warning approach: MEDIUM - Multiple valid approaches, recommendation based on simplicity

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (stable patterns, low churn domain)
