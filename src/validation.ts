import { ClientConfig } from './types.js';
import { getClientConfig } from './config.js';

/**
 * Result type for clientId validation in tool handlers.
 * Discriminated union for type-safe error handling.
 */
export type ClientValidationResult =
  | { success: true; config: ClientConfig }
  | { success: false; error: string };

/**
 * Validate clientId and return config or error.
 * Used at the start of every tool handler.
 *
 * @param clientId - The client identifier from tool parameters
 * @returns Config on success, error message with valid IDs on failure
 */
export function validateClientId(clientId: string): ClientValidationResult {
  // Normalize: trim and lowercase for consistent lookup
  const normalized = clientId.trim().toLowerCase();

  // Validate format: alphanumeric and underscores only
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      success: false,
      error: `Invalid client ID format: "${clientId}". Must contain only lowercase alphanumeric characters and underscores. Use list_clients to see available clients.`,
    };
  }

  // Look up config
  const config = getClientConfig(normalized);
  if (!config) {
    return {
      success: false,
      error: `Unknown client ID: "${clientId}". Use list_clients to see available clients.`,
    };
  }

  return { success: true, config };
}

/**
 * Create MCP tool error result for invalid clientId.
 * Returns isError: true so LLM sees the error and can retry.
 */
export function createClientIdErrorResult(errorMessage: string) {
  return {
    content: [{ type: 'text' as const, text: errorMessage }],
    isError: true,
  };
}
