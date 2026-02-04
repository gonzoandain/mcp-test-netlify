/**
 * TTL-based cache for MCP server instances.
 * Stores one server per client ID with automatic eviction after idle period.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Default TTL: 5 minutes.
 * Hardcoded per design decision - not configurable via env var.
 */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Internal cache entry structure.
 * Associates a server instance with its eviction timer.
 */
interface CacheEntry {
  server: McpServer;
  timer: NodeJS.Timeout;
}

/**
 * TTL-based cache for MCP server instances.
 *
 * Features:
 * - Stores one server per client ID
 * - Automatic eviction after TTL expires
 * - TTL resets on each access (LRU-like behavior)
 * - timer.unref() prevents blocking process exit
 */
export class ServerCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  /**
   * Create a new ServerCache.
   *
   * @param ttlMs - Time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get a cached server instance.
   * Resets the TTL timer on access.
   *
   * @param clientId - The client identifier
   * @returns The cached McpServer or undefined if not found
   */
  get(clientId: string): McpServer | undefined {
    const entry = this.cache.get(clientId);

    if (!entry) {
      return undefined;
    }

    // Reset TTL timer on access
    clearTimeout(entry.timer);
    entry.timer = this.createEvictionTimer(clientId);

    return entry.server;
  }

  /**
   * Store a server instance in the cache.
   * If an entry already exists for this client, its timer is cleared first.
   *
   * @param clientId - The client identifier
   * @param server - The McpServer instance to cache
   */
  set(clientId: string, server: McpServer): void {
    // Clear existing timer if present (prevent memory leak)
    const existing = this.cache.get(clientId);
    if (existing) {
      clearTimeout(existing.timer);
    }

    // Create new entry with eviction timer
    this.cache.set(clientId, {
      server,
      timer: this.createEvictionTimer(clientId),
    });
  }

  /**
   * Check if a client has a cached server.
   *
   * @param clientId - The client identifier
   * @returns true if entry exists, false otherwise
   */
  has(clientId: string): boolean {
    return this.cache.has(clientId);
  }

  /**
   * Get the number of cached entries.
   * Useful for testing and monitoring.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Create an eviction timer for a cache entry.
   * Timer automatically removes the entry after TTL expires.
   *
   * @param clientId - The client identifier to evict
   * @returns The eviction timer
   */
  private createEvictionTimer(clientId: string): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.cache.delete(clientId);
    }, this.ttlMs);

    // Don't block process exit waiting for cache eviction
    timer.unref();

    return timer;
  }
}

/**
 * Singleton cache instance for application use.
 * Uses default 5-minute TTL.
 */
export const serverCache = new ServerCache();
