import { ClientConfig, ClientsConfig } from './types.js';

/**
 * Parse CLIENTS_CONFIG env vars at module load time.
 * This ensures config is parsed once, not per-request.
 *
 * Supports two formats:
 * 1. Split: CLIENTS_CONFIG_1 + CLIENTS_CONFIG_2 (for large configs over 5000 chars)
 * 2. Single: CLIENTS_CONFIG (for smaller configs)
 *
 * Falls back to legacy single-client env vars if neither is set,
 * creating a "default" client entry for backward compatibility.
 */
function loadClientsConfig(): ClientsConfig {
  // Try split config first (for large configs)
  const config1 = process.env.CLIENTS_CONFIG_1;
  const config2 = process.env.CLIENTS_CONFIG_2;

  let configJson: string | undefined;

  if (config1 && config2) {
    // Merge two JSON objects: parse both, spread into one, re-stringify
    try {
      const parsed1 = JSON.parse(config1);
      const parsed2 = JSON.parse(config2);
      configJson = JSON.stringify({ ...parsed1, ...parsed2 });
      console.log('Using split CLIENTS_CONFIG_1 + CLIENTS_CONFIG_2');
    } catch (error) {
      throw new Error(`Failed to parse split config: ${error instanceof Error ? error.message : error}`);
    }
  } else {
    configJson = process.env.CLIENTS_CONFIG;
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
