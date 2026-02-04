/**
 * Configuration for a single client connection.
 * Used by buildOneAppServer to configure the MCP server instance.
 */
export interface ClientConfig {
  /** Bearer token or API key for authentication */
  authorization: string;
  /** Base URL for OneApp Core API */
  coreBaseUrl: string;
  /** Base URL for OneApp Client API */
  clientBaseUrl: string;
  /** Client identifier header value */
  clientHeader: string;
  /** Optional timeout override in milliseconds (default 30000) */
  httpTimeoutMs?: number;
}
