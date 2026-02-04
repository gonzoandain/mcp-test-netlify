/**
 * Configuration for a single client connection.
 * Used by buildOneAppServer to configure the MCP server instance.
 *
 * When using multi-tenant mode, store all client configs in CLIENTS_CONFIG env var:
 *
 * @example
 * // CLIENTS_CONFIG env var format:
 * {
 *   "sechpos": {
 *     "authorization": "Bearer token-sechpos",
 *     "coreBaseUrl": "https://api.oneapp.cl",
 *     "clientBaseUrl": "https://sechpos.oneapp.cl",
 *     "clientHeader": "sechpos-header-value"
 *   },
 *   "acme": {
 *     "authorization": "Bearer token-acme",
 *     "coreBaseUrl": "https://api.oneapp.cl",
 *     "clientBaseUrl": "https://acme.oneapp.cl",
 *     "clientHeader": "acme-header-value"
 *   }
 * }
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

/**
 * Record mapping client IDs to their configurations.
 * Parsed from CLIENTS_CONFIG env var (JSON).
 *
 * Example CLIENTS_CONFIG JSON:
 * {
 *   "client-a": {
 *     "authorization": "Bearer token-a",
 *     "coreBaseUrl": "https://api.oneapp.cl",
 *     "clientBaseUrl": "https://clienta.oneapp.cl",
 *     "clientHeader": "client-a-header"
 *   },
 *   "client-b": {
 *     "authorization": "Bearer token-b",
 *     "coreBaseUrl": "https://api.oneapp.cl",
 *     "clientBaseUrl": "https://clientb.oneapp.cl",
 *     "clientHeader": "client-b-header"
 *   }
 * }
 */
export type ClientsConfig = Record<string, ClientConfig>;
