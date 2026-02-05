import { ClientConfig } from './types.js';

const DEFAULT_HTTP_TIMEOUT_MS = 30000;

/**
 * Make authenticated HTTP request using client config.
 * Extracted from oneappServer.ts closure pattern.
 *
 * @param config - Client configuration with auth and URLs
 * @param baseUrl - Base URL for the request
 * @param path - API path to append
 * @param options - Fetch options
 */
export async function httpJson<T>(
  config: ClientConfig,
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const timeoutMs = config.httpTimeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;
  const url = new URL(path, baseUrl);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (config.authorization) {
    headers['Authorization'] = config.authorization;
  }

  if (config.clientHeader) {
    headers['client'] = config.clientHeader;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP Error Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}
