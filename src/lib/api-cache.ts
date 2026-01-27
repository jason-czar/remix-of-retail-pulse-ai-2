/**
 * Client-side API response cache with TTL support
 * Reduces upstream API calls by caching responses in memory
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  maxItems: number;
  defaultTTL: number; // in milliseconds
}

class APICache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxItems: config.maxItems ?? 100,
      defaultTTL: config.defaultTTL ?? 30000, // 30 seconds default
    };
  }

  /**
   * Generate a cache key from action and params
   */
  private generateKey(action: string, params: Record<string, string>): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${action}:${sortedParams}`;
  }

  /**
   * Get cached data if valid, otherwise return null
   */
  get<T>(action: string, params: Record<string, string>): T | null {
    const key = this.generateKey(action, params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache with TTL
   */
  set<T>(action: string, params: Record<string, string>, data: T, ttl?: number): void {
    const key = this.generateKey(action, params);
    const now = Date.now();

    // Prune cache if at max capacity
    if (this.cache.size >= this.config.maxItems) {
      this.prune();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl ?? this.config.defaultTTL),
    });
  }

  /**
   * Remove expired entries and oldest entries if over capacity
   */
  private prune(): void {
    const now = Date.now();
    const entries: [string, CacheEntry<unknown>][] = [];

    // First pass: remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      } else {
        entries.push([key, entry]);
      }
    }

    // If still over capacity, remove oldest entries
    if (entries.length >= this.config.maxItems) {
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.ceil(entries.length * 0.2)); // Remove oldest 20%
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries for a specific symbol
   */
  clearSymbol(symbol: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`symbol=${symbol}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxItems: number } {
    return {
      size: this.cache.size,
      maxItems: this.config.maxItems,
    };
  }
}

// TTL configurations for different action types (in milliseconds)
export const CACHE_TTL = {
  trending: 60000,      // 1 minute - trending data changes frequently
  sentiment: 30000,     // 30 seconds - sentiment can shift quickly
  stats: 30000,         // 30 seconds
  messages: 15000,      // 15 seconds - messages are more real-time
  analytics: 60000,     // 1 minute - analytics are aggregated data
} as const;

// Singleton cache instance
export const apiCache = new APICache({
  maxItems: 100,
  defaultTTL: 30000,
});

/**
 * Wrapper for cached API calls
 */
export async function cachedApiCall<T>(
  action: string,
  params: Record<string, string>,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = apiCache.get<T>(action, params);
  if (cached !== null) {
    console.debug(`[Cache HIT] ${action}`, params);
    return cached;
  }

  console.debug(`[Cache MISS] ${action}`, params);
  
  // Fetch fresh data
  const data = await fetchFn();
  
  // Determine TTL based on action type
  const cacheTTL = ttl ?? CACHE_TTL[action as keyof typeof CACHE_TTL] ?? 30000;
  
  // Cache the result
  apiCache.set(action, params, data, cacheTTL);
  
  return data;
}
