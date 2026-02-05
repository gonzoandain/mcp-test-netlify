import { ClientConfig, ClientsConfig } from './types.js';
import { gunzipSync } from 'zlib';

/**
 * Decompress gzip+base64 encoded string.
 */
function decompressConfig(compressed: string): string {
  const buffer = Buffer.from(compressed, 'base64');
  const decompressed = gunzipSync(buffer);
  return decompressed.toString('utf-8');
}

/**
 * Parse CLIENTS_CONFIG env var at module load time.
 * This ensures config is parsed once, not per-request.
 *
 * Supports two formats:
 * 1. Compressed: gzip + base64 encoded JSON (for AWS Lambda 4KB limit)
 * 2. Plain JSON: uncompressed (for local dev or small configs)
 *
 * Falls back to legacy single-client env vars if not set,
 * creating a "default" client entry for backward compatibility.
 */
function loadClientsConfig(): ClientsConfig {
  let configJson: string | undefined = process.env.CLIENTS_CONFIG;

  if (configJson) {
    // Detect if compressed (base64 gzip starts with H4sI)
    if (configJson.startsWith('H4sI')) {
      try {
        configJson = decompressConfig(configJson);
        console.log('Decompressed CLIENTS_CONFIG from gzip+base64');
      } catch (error) {
        throw new Error(`Failed to decompress CLIENTS_CONFIG: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  if (configJson) {
    try {
      const parsed = JSON.parse(configJson);

      // Validate structure: should be an object with string keys
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('CLIENTS_CONFIG must be a JSON object mapping client IDs to configs');
      }

      // Basic validation of each client config
      for (const [clientId, config] of Object.entries(parsed)) {
        if (typeof config !== 'object' || config === null) {
          throw new Error(`CLIENTS_CONFIG["${clientId}"] must be an object`);
        }
        const c = config as Record<string, unknown>;
        if (typeof c.authorization !== 'string') {
          throw new Error(`CLIENTS_CONFIG["${clientId}"].authorization must be a string`);
        }
        if (typeof c.coreBaseUrl !== 'string') {
          throw new Error(`CLIENTS_CONFIG["${clientId}"].coreBaseUrl must be a string`);
        }
        if (typeof c.clientBaseUrl !== 'string') {
          throw new Error(`CLIENTS_CONFIG["${clientId}"].clientBaseUrl must be a string`);
        }
        if (typeof c.clientHeader !== 'string') {
          throw new Error(`CLIENTS_CONFIG["${clientId}"].clientHeader must be a string`);
        }
      }

      return parsed as ClientsConfig;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`CLIENTS_CONFIG is not valid JSON: ${error.message}`);
      }
      throw error;
    }
  }

  // Fallback: build config from legacy single-client env vars
  // This maintains backward compatibility during transition
  console.log('CLIENTS_CONFIG not set, using legacy env vars with "default" client ID');

  return {
    default: {
      authorization: process.env.AUTHORIZATION || '',
      coreBaseUrl: process.env.CORE_BASE_URL || 'https://api.oneapp.cl',
      clientBaseUrl: process.env.CLIENT_BASE_URL || 'https://sechpos.oneapp.cl',
      clientHeader: process.env.CLIENT_HEADER || '',
      httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '30000', 10),
    }
  };
}

/**
 * Parsed client configurations.
 * Loaded once at module initialization.
 */
export const clientsConfig: ClientsConfig = loadClientsConfig();

/**
 * Get configuration for a specific client ID.
 *
 * @param clientId - The client identifier
 * @returns ClientConfig if found, undefined if not
 */
export function getClientConfig(clientId: string): ClientConfig | undefined {
  return clientsConfig[clientId];
}

/**
 * Get all available client IDs.
 */
export function getClientIds(): string[] {
  return Object.keys(clientsConfig);
}
