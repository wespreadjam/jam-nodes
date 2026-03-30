import type { RateLimitStore } from '../types/execution.js';

/**
 * Simple in-memory rate-limit store backed by a Map of timestamp arrays.
 * Expired timestamps are lazily pruned on access.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private windows = new Map<string, number[]>();

  async record(key: string): Promise<void> {
    const timestamps = this.windows.get(key) ?? [];
    timestamps.push(Date.now());
    this.windows.set(key, timestamps);
  }

  async getCount(key: string, windowMs: number): Promise<number> {
    this.prune(key, windowMs);
    return (this.windows.get(key) ?? []).length;
  }

  async getOldestInWindow(key: string, windowMs: number): Promise<number | undefined> {
    this.prune(key, windowMs);
    const timestamps = this.windows.get(key);
    return timestamps?.[0];
  }

  private prune(key: string, windowMs: number): void {
    const timestamps = this.windows.get(key);
    if (!timestamps) return;
    const cutoff = Date.now() - windowMs;
    const pruned = timestamps.filter((t) => t > cutoff);
    if (pruned.length === 0) {
      this.windows.delete(key);
    } else {
      this.windows.set(key, pruned);
    }
  }
}
