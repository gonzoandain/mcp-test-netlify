# Technology Stack

**Analysis Date:** 2026-02-04

## Languages

**Primary:**
- TypeScript 5.0.0 - All source code and function handlers

**Secondary:**
- JavaScript - Generated from TypeScript compilation

## Runtime

**Environment:**
- Node.js 20.0.0 (minimum, as per devDependencies)

**Package Manager:**
- npm 10.x (inferred from package-lock.json)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Express.js 5.1.0 - Web framework for HTTP handling
- Netlify Functions 2.5.1 - Serverless function runtime and bundling

**Protocol/Server:**
- Model Context Protocol (MCP) SDK 1.2.0 - MCP server implementation via `@modelcontextprotocol/sdk`

**Testing:**
- Not detected

**Build/Dev:**
- TypeScript Compiler 5.0.0 - Language transpilation
- Netlify CLI - Local development server (via `netlify dev`)

## Key Dependencies

**Critical:**
- `@modelcontextprotocol/sdk` 1.2.0 - Provides `McpServer`, `StreamableHTTPServerTransport`, and MCP protocol types
- `@netlify/functions` 2.5.1 - Netlify function handler definitions and utilities
- `serverless-http` 3.2.0 - Bridges Express.js with serverless function handlers
- `fetch-to-node` 2.0.0 - Converts Fetch API Request/Response to Node.js req/res for MCP compatibility

**Infrastructure/Utility:**
- `zod` 3.23.8 - Runtime schema validation for MCP tool parameters
- `express` 5.1.0 - HTTP request routing and middleware (integrated with serverless-http)
- `dotenv` 17.2.1 - Environment variable loading from `.env` files (dev only)

**Type Definitions:**
- `@types/express` 5.0.1 - TypeScript definitions for Express.js
- `@types/node` 20.0.0 - TypeScript definitions for Node.js APIs

## Configuration

**Environment:**
- Configured via environment variables (not `.env` for production)
- `.env` file used in development only (`NODE_ENV !== 'production'`)
- Key environment variables:
  - `CORE_BASE_URL` - Base URL for OneApp Core API (required)
  - `CLIENT_BASE_URL` - Base URL for OneApp Client API (required)
  - `AUTHORIZATION` - Bearer token or API key for OneApp authentication
  - `CLIENT_HEADER` - Client identifier header value
  - `HTTP_TIMEOUT_MS` - Request timeout in milliseconds (default: 30000)
  - `NODE_ENV` - Development/production mode detection

**Build:**
- TypeScript Configuration: `tsconfig.json`
  - Target: ES2022
  - Module: ESNext
  - Module Resolution: node
  - Strict mode: enabled
  - Output directory: `./dist`
  - Root directory: `.` (both `src/` and `netlify/` compiled)

**Netlify Configuration:**
- Configuration file: `netlify.toml`
- Build output: `netlify/functions` (source) → `dist/netlify/functions` (compiled)
- Static files: `public/` directory
- Functions included files: `**/*.js`, `**/*.mjs`

## Platform Requirements

**Development:**
- Node.js 20.0.0+
- npm 10.x or compatible
- Netlify CLI for local testing (`npm run dev`)
- TypeScript compiler (included in devDependencies)

**Production:**
- Netlify Functions runtime (Node.js 20.x compatible)
- HTTP/1.1 or HTTP/2 capable
- Environment variables configured in Netlify dashboard

**Deployment:**
- Netlify platform required
- CI/CD detection via `netlify.toml` ignore rule on diff
- Functions served at path: `/mcp` (defined in `netlify/functions/mcp.ts`)

---

*Stack analysis: 2026-02-04*
