import type { CacheStore } from '../types/execution.js';

interface CacheEntry {
  value: unknown;
  expireAt: number;
}

/**
 * Simple in-memory cache store backed by a Map.
 * Expired entries are lazily evicted on read.
 */
export class MemoryCacheStore implements CacheStore {
  private cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}
