/**
 * Simple in-memory cache for performance optimization
 * Reduces redundant file I/O and JSON parsing
 */

export class DataCache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  private ttl: number; // Time to live in milliseconds

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  /**
   * Get cached data by key
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data
   */
  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Global cache instances for different data types
 */
export const workItemsCache = new DataCache<any[]>(600); // 10 minutes
export const historyCache = new DataCache<any[]>(600); // 10 minutes
export const metricCache = new DataCache<any>(300); // 5 minutes

/**
 * Generate cache key for file path
 */
export function fileCacheKey(filePath: string): string {
  return `file:${filePath}`;
}

/**
 * Generate cache key for metric calculation
 */
export function metricCacheKey(
  metricName: string,
  dataHash: string,
  params?: Record<string, any>
): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `metric:${metricName}:${dataHash}:${paramStr}`;
}

/**
 * Simple hash function for data
 */
export function simpleHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
