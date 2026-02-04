/**
 * Routing utilities for multi-tenant request handling.
 * Validates X-Client-ID header and provides error response helpers.
 */

/**
 * Error codes for routing failures.
 * Used in error responses for machine-readable error handling.
 */
export const ERROR_CODES = {
  MISSING_CLIENT_ID: 'MISSING_CLIENT_ID',
  DUPLICATE_CLIENT_ID: 'DUPLICATE_CLIENT_ID',
  INVALID_CLIENT_ID: 'INVALID_CLIENT_ID',
  UNKNOWN_CLIENT: 'UNKNOWN_CLIENT',
} as const;

/**
 * Routing error structure.
 * Contains machine-readable code and human-readable message.
 */
export interface RoutingError {
  code: typeof ERROR_CODES[keyof typeof ERROR_CODES];
  message: string;
}

/**
 * Error messages for each error code.
 * Provides helpful guidance for API consumers.
 */
const ERROR_MESSAGES: Record<typeof ERROR_CODES[keyof typeof ERROR_CODES], string> = {
  [ERROR_CODES.MISSING_CLIENT_ID]: 'Missing X-Client-ID header. Provide client identifier.',
  [ERROR_CODES.DUPLICATE_CLIENT_ID]: 'Multiple X-Client-ID headers detected. Provide exactly one.',
  [ERROR_CODES.INVALID_CLIENT_ID]: 'Client ID must contain only alphanumeric characters (a-z, 0-9).',
  [ERROR_CODES.UNKNOWN_CLIENT]: 'Unknown client ID: {id}. Check X-Client-ID header value.',
};

/**
 * Result type for header validation.
 * Discriminated union for type-safe error handling.
 */
export type ValidationResult =
  | { success: true; clientId: string }
  | { success: false; error: RoutingError };

/**
 * Create a JSON error response.
 *
 * @param error - The routing error to include in response
 * @param status - HTTP status code
 * @returns Response with JSON body containing error details
 */
export function createErrorResponse(error: RoutingError, status: number): Response {
  return new Response(
    JSON.stringify({ error: error.message, code: error.code }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create a RoutingError for unknown client.
 * Interpolates client ID into error message.
 *
 * @param clientId - The unknown client ID
 * @returns RoutingError with UNKNOWN_CLIENT code
 */
export function createUnknownClientError(clientId: string): RoutingError {
  return {
    code: ERROR_CODES.UNKNOWN_CLIENT,
    message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_CLIENT].replace('{id}', clientId),
  };
}

/**
 * Validate and extract client ID from request headers.
 *
 * Validation rules:
 * - Header is required (returns MISSING_CLIENT_ID if absent)
 * - Only one header allowed (returns DUPLICATE_CLIENT_ID if comma-separated)
 * - Value is trimmed and lowercased for normalization
 * - Must be alphanumeric only (returns INVALID_CLIENT_ID otherwise)
 *
 * @param headers - Web API Headers object from request
 * @returns ValidationResult with clientId on success, error on failure
 */
export function validateClientHeader(headers: Headers): ValidationResult {
  // Get header value (case-insensitive via Headers.get())
  const headerValue = headers.get('x-client-id');

  // Check for missing header
  if (headerValue === null) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.MISSING_CLIENT_ID,
        message: ERROR_MESSAGES[ERROR_CODES.MISSING_CLIENT_ID],
      },
    };
  }

  // Check for duplicate headers (combined with comma per HTTP spec)
  if (headerValue.includes(',')) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.DUPLICATE_CLIENT_ID,
        message: ERROR_MESSAGES[ERROR_CODES.DUPLICATE_CLIENT_ID],
      },
    };
  }

  // Normalize: trim whitespace and lowercase
  const normalized = headerValue.trim().toLowerCase();

  // Check for empty after trim
  if (normalized === '') {
    return {
      success: false,
      error: {
        code: ERROR_CODES.MISSING_CLIENT_ID,
        message: ERROR_MESSAGES[ERROR_CODES.MISSING_CLIENT_ID],
      },
    };
  }

  // Validate format: alphanumeric only
  if (!/^[a-z0-9]+$/.test(normalized)) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_CLIENT_ID,
        message: ERROR_MESSAGES[ERROR_CODES.INVALID_CLIENT_ID],
      },
    };
  }

  return {
    success: true,
    clientId: normalized,
  };
}
