// netlify/functions/mcp.ts
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toFetchResponse, toReqRes } from 'fetch-to-node';
import type { JSONRPCError } from '@modelcontextprotocol/sdk/types.js';

import { buildOneAppServer } from '../../src/oneappServer.js';

/**
 * CORS headers. `Mcp-Session-Id` and `Mcp-Protocol-Version` must be exposed or
 * browser-based clients cannot read them off the response.
 */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID, X-Client-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonRpcError(status: number, code: number, message: string, id: string | number = '', extraHeaders: Record<string, string> = {}): Response {
  return withCors(
    new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id } satisfies JSONRPCError),
      { status, headers: { 'Content-Type': 'application/json', ...extraHeaders } },
    ),
  );
}

/**
 * Netlify function handler — all MCP traffic is POSTed here.
 *
 * Runs in **stateless mode**: a fresh server + transport is built per request
 * (`sessionIdGenerator: undefined`). Netlify Functions are serverless, so any
 * in-memory session map would be lost between invocations anyway — statelessness
 * is the only session model that is actually honest about the runtime.
 *
 * Note: header-based routing removed in v1.1. Tools now accept clientId as
 * first parameter and validate it internally. This allows LLMs to switch
 * between clients without connection changes.
 */
export default async function handler(req: Request): Promise<Response> {
  // Preflight — must succeed or browser-origin clients never get to POST.
  if (req.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }));
  }

  // Stateless mode has no server-initiated stream to attach to.
  if (req.method === 'GET') {
    return jsonRpcError(405, -32000, 'Method not allowed: this server is stateless and does not support SSE streams via GET.', '', { Allow: 'POST, DELETE, OPTIONS' });
  }

  // No session to terminate, but answering cleanly keeps client teardown quiet.
  if (req.method === 'DELETE') {
    return withCors(new Response(null, { status: 204 }));
  }

  if (req.method !== 'POST') {
    return jsonRpcError(405, -32000, 'Method not allowed', '', { Allow: 'POST, GET, DELETE, OPTIONS' });
  }

  let cleanup = async () => {};

  try {
    // Check for deprecated X-Client-ID header
    const clientIdHeader = req.headers.get('x-client-id');

    const body = await req.json();

    // Netlify gives us Web-standard Request/Response objects; MCP wants Node req/res
    const { req: nodeReq, res: nodeRes } = toReqRes(req);

    const server = buildOneAppServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    // `toFetchResponse` resolves as soon as the headers are flushed — the body
    // may still be an open stream. Tear down only once the response has really
    // ended, or an in-flight SSE body gets truncated.
    let closed = false;
    cleanup = async () => {
      if (closed) return;
      closed = true;
      try {
        await transport.close();
        await server.close();
      } catch (closeErr) {
        console.error('Error closing MCP server:', closeErr);
      }
    };
    nodeRes.on('finish', () => void cleanup());
    nodeRes.on('close', () => void cleanup());

    await server.connect(transport);
    await transport.handleRequest(nodeReq, nodeRes, body);

    // Get the response that was written to nodeRes
    let response = await toFetchResponse(nodeRes);

    // If deprecated header was used, inject warning into response
    if (clientIdHeader) {
      console.warn('X-Client-ID header is deprecated. Use clientId parameter in tool calls instead.');

      try {
        const responseBody = await response.clone().json();
        // For MCP responses with result.content array, prepend warning
        if (responseBody.result?.content && Array.isArray(responseBody.result.content)) {
          responseBody.result.content.unshift({
            type: 'text',
            text: '[DEPRECATION WARNING] X-Client-ID header is deprecated. Use clientId parameter in tool calls instead.'
          });
          response = new Response(JSON.stringify(responseBody), {
            status: response.status,
            headers: response.headers
          });
        }
      } catch {
        // If response isn't JSON or doesn't have expected structure, just return original
      }
    }

    return withCors(response);
  } catch (err) {
    console.error('MCP request failed:', err);

    // Try to get the request ID from the original body
    let requestId: string | number = '';
    try {
      const errorBody = await req.clone().json();
      requestId = errorBody?.id ?? '';
    } catch {
      // Ignore error parsing body for error response
    }

    // The response never got off the ground, so tearing down now is safe.
    await cleanup();

    return jsonRpcError(500, -32603, `Internal server error: ${err instanceof Error ? err.message : String(err)}`, requestId);
  }
}

/** Expose the function at <domain>/mcp */
export const config = { path: '/mcp' };
