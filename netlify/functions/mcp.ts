// netlify/functions/mcp.ts
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { toFetchResponse, toReqRes } from 'fetch-to-node';
import type { JSONRPCError } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { buildOneAppServer } from '../../src/oneappServer.js';

/** Cache the server across invocations (Netlify keeps the function "warm") */
let cached: McpServer | null = null;
function getServer(): McpServer {
  if (cached) return cached;
  cached = buildOneAppServer();
  return cached;
}

// Store transports by session ID for proper session management
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

/**
 * Netlify function handler — all MCP traffic is POSTed here
 */
export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Netlify gives us Web-standard Request/Response objects; MCP wants Node req/res
    const { req: nodeReq, res: nodeRes } = toReqRes(req);

    const body = await req.json();
    const sessionId = req.headers.get('mcp-session-id');

    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport for this session
      transport = transports[sessionId];
    } else if (isInitializeRequest(body)) {
      // New initialization request - create new transport (session ID may or may not be present)
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId || randomUUID(),
        onsessioninitialized: (initSessionId) => {
          // Store the transport by session ID when session is initialized
          transports[initSessionId] = transport;
          // Also store by request session ID if different
          if (sessionId && sessionId !== initSessionId) {
            transports[sessionId] = transport;
          }
        }
      });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
        }
        // Also clean up the request session ID if it was different
        if (sessionId && sessionId !== sid && transports[sessionId]) {
          delete transports[sessionId];
        }
      };

      // Connect the transport to the MCP server
      const server = getServer();
      await server.connect(transport);
      
      // Store immediately by request session ID if present
      if (sessionId) {
        transports[sessionId] = transport;
      }
    } else {
      // For non-initialization requests without an existing transport,
      // we'll create a transport and perform implicit initialization
      
      const finalSessionId = sessionId || randomUUID();
      
      // Create transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => finalSessionId,
        onsessioninitialized: (initSessionId) => {
          transports[initSessionId] = transport;
          if (finalSessionId !== initSessionId) {
            transports[finalSessionId] = transport;
          }
        }
      });

      // Set up onclose handler
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
        }
        if (finalSessionId !== sid && transports[finalSessionId]) {
          delete transports[finalSessionId];
        }
      };

      // Connect the transport to the MCP server
      const server = getServer();
      await server.connect(transport);
      
      // Store the transport
      transports[finalSessionId] = transport;
      
      // Create a synthetic initialization request to properly initialize the session
      const initRequest = {
        jsonrpc: '2.0' as const,
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'mcp-inspector', version: '1.0.0' }
        }
      };
      
      
      // Create temporary Node.js request/response for initialization
      const { req: initNodeReq, res: initNodeRes } = toReqRes(new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify(initRequest)
      }));
      
      // Handle the initialization request
      await transport.handleRequest(initNodeReq, initNodeRes, initRequest);
    }

    // Handle the request with the appropriate transport
    await transport.handleRequest(nodeReq, nodeRes, body);

    return toFetchResponse(nodeRes);
  } catch (err) {    
    // Try to get the request ID from the original body
    let requestId = '';
    try {
      const errorBody = await req.clone().json();
      requestId = errorBody?.id || '';
    } catch {
      // Ignore error parsing body for error response
    }
    
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: `Internal server error: ${err instanceof Error ? err.message : String(err)}` },
        id: requestId,
      } satisfies JSONRPCError),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/** Expose the function at <domain>/mcp */
export const config = { path: '/mcp' };
