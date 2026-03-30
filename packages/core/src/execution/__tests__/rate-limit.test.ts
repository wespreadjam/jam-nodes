import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { executeNode } from '../execute-node.js';
import { MemoryRateLimitStore } from '../memory-rate-limit-store.js';
import type { NodeDefinition, NodeExecutionContext } from '../../types/node.js';
import type { RateLimitConfig } from '../../types/execution.js';

const echoNode: NodeDefinition<{ value: string }, { value: string }> = {
  type: 'echo',
  name: 'Echo',
  description: 'Returns input as output',
  category: 'action',
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ value: z.string() }),
  executor: async (input) => ({
    success: true,
    output: { value: input.value },
  }),
};

const mockContext: NodeExecutionContext = {
  userId: 'test',
  workflowExecutionId: 'wf_test',
  variables: {},
};

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  it('starts with zero count', async () => {
    const count = await store.getCount('key', 1000);
    expect(count).toBe(0);
  });

  it('records and counts requests', async () => {
    await store.record('key');
    await store.record('key');
    const count = await store.getCount('key', 1000);
    expect(count).toBe(2);
  });

  it('returns oldest timestamp in window', async () => {
    await store.record('key');
    const oldest = await store.getOldestInWindow('key', 1000);
    expect(oldest).toBeDefined();
    expect(oldest).toBeLessThanOrEqual(Date.now());
  });

  it('returns undefined for oldest when no records exist', async () => {
    const oldest = await store.getOldestInWindow('key', 1000);
    expect(oldest).toBeUndefined();
  });

  it('prunes expired timestamps', async () => {
    await store.record('key');
    // Simulate time passing by checking with a tiny window
    // The record was just made, so a 0ms window should prune it
    const count = await store.getCount('key', 0);
    expect(count).toBe(0);
  });

  it('isolates keys', async () => {
    await store.record('a');
    await store.record('b');
    await store.record('b');
    expect(await store.getCount('a', 1000)).toBe(1);
    expect(await store.getCount('b', 1000)).toBe(2);
  });
});

describe('executeNode with rate limiting', () => {
  it('executes immediately when under rate limit', async () => {
    const store = new MemoryRateLimitStore();
    const config: RateLimitConfig = { maxRequests: 5, windowMs: 1000, store };

    const start = Date.now();
    const result = await executeNode(echoNode, { value: 'hello' }, mockContext, { rateLimit: config });
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.output?.value).toBe('hello');
    expect(elapsed).toBeLessThan(100);
  });

  it('records each execution in the rate limit store', async () => {
    const store = new MemoryRateLimitStore();
    const config: RateLimitConfig = { maxRequests: 10, windowMs: 1000, store };

    await executeNode(echoNode, { value: 'a' }, mockContext, { rateLimit: config });
    await executeNode(echoNode, { value: 'b' }, mockContext, { rateLimit: config });
    await executeNode(echoNode, { value: 'c' }, mockContext, { rateLimit: config });

    const count = await store.getCount('default', 1000);
    expect(count).toBe(3);
  });

  it('waits when rate limit is reached', async () => {
    const store = new MemoryRateLimitStore();
    const windowMs = 200;
    const config: RateLimitConfig = { maxRequests: 2, windowMs, store };

    // Fill the rate limit window
    await executeNode(echoNode, { value: '1' }, mockContext, { rateLimit: config });
    await executeNode(echoNode, { value: '2' }, mockContext, { rateLimit: config });

    // Third call should wait for the window to expire
    const start = Date.now();
    const result = await executeNode(echoNode, { value: '3' }, mockContext, { rateLimit: config });
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(100); // Should have waited ~200ms
  });

  it('uses custom keyFn to isolate rate limits', async () => {
    const store = new MemoryRateLimitStore();
    const config: RateLimitConfig = {
      maxRequests: 1,
      windowMs: 1000,
      store,
      keyFn: (input) => (input as { value: string }).value,
    };

    // These should not interfere with each other since they have different keys
    const start = Date.now();
    await executeNode(echoNode, { value: 'a' }, mockContext, { rateLimit: config });
    await executeNode(echoNode, { value: 'b' }, mockContext, { rateLimit: config });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100); // No waiting since different keys
    expect(await store.getCount('a', 1000)).toBe(1);
    expect(await store.getCount('b', 1000)).toBe(1);
  });

  it('works alongside retry config', async () => {
    let attempts = 0;
    const failOnceNode: NodeDefinition<{ value: string }, { value: string }> = {
      ...echoNode,
      type: 'fail_once',
      executor: async (input) => {
        attempts++;
        if (attempts === 1) {
          return { success: false, error: 'transient failure' };
        }
        return { success: true, output: { value: input.value } };
      },
    };

    const store = new MemoryRateLimitStore();
    const result = await executeNode(failOnceNode, { value: 'test' }, mockContext, {
      rateLimit: { maxRequests: 10, windowMs: 1000, store },
      retry: { maxAttempts: 3, backoffMs: 0 },
    });

    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
  });

  it('executes without delay when no rate limit config is provided', async () => {
    const start = Date.now();
    const result = await executeNode(echoNode, { value: 'no-limit' }, mockContext);
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(50);
  });
});
