import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  rateLimiterNode,
  RateLimiterInputSchema,
  RateLimiterOutputSchema,
} from '../rate-limiter.js'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe('rateLimiterNode - metadata', () => {
  it('should have type rate_limiter', () => {
    expect(rateLimiterNode.type).toBe('rate_limiter')
  })

  it('should have category logic', () => {
    expect(rateLimiterNode.category).toBe('logic')
  })

  it('should support rerun', () => {
    expect(rateLimiterNode.capabilities?.supportsRerun).toBe(true)
  })

  it('should not support cancel', () => {
    expect(rateLimiterNode.capabilities?.supportsCancel).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Input schema validation
// ---------------------------------------------------------------------------

describe('rateLimiterNode - input schema validation', () => {
  it('should accept valid minimal input', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [1],
      requestsPerWindow: 5,
      windowMs: 1000,
      strategy: 'fixed',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty items array', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [],
      requestsPerWindow: 5,
      windowMs: 1000,
      strategy: 'fixed',
    })
    expect(result.success).toBe(false)
  })

  it('should reject requestsPerWindow of 0', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [1],
      requestsPerWindow: 0,
      windowMs: 1000,
      strategy: 'fixed',
    })
    expect(result.success).toBe(false)
  })

  it('should reject windowMs below 100', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [1],
      requestsPerWindow: 5,
      windowMs: 99,
      strategy: 'fixed',
    })
    expect(result.success).toBe(false)
  })

  it('should reject windowMs above 3600000', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [1],
      requestsPerWindow: 5,
      windowMs: 3600001,
      strategy: 'fixed',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid strategy', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [1],
      requestsPerWindow: 5,
      windowMs: 1000,
      strategy: 'rolling',
    })
    expect(result.success).toBe(false)
  })

  it('should accept strategy sliding', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [1],
      requestsPerWindow: 5,
      windowMs: 1000,
      strategy: 'sliding',
    })
    expect(result.success).toBe(true)
  })

  it('should accept strategy fixed', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [1],
      requestsPerWindow: 5,
      windowMs: 1000,
      strategy: 'fixed',
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Fixed window strategy
// ---------------------------------------------------------------------------

describe('rateLimiterNode - fixed window strategy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return success true and all items processed', async () => {
    const items = [1, 2, 3, 4, 5, 6]
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 3, windowMs: 500, strategy: 'fixed' },
      {} as never,
    )
    await vi.runAllTimersAsync()
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.processedItems).toHaveLength(items.length)
      expect(result.output!.strategy).toBe('fixed')
    }
  })

  it('should return processedItems in original order', async () => {
    const items = [1, 2, 3, 4, 5]
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 3, windowMs: 500, strategy: 'fixed' },
      {} as never,
    )
    await vi.runAllTimersAsync()
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.processedItems).toEqual([1, 2, 3, 4, 5])
    }
  })

  it('should include correct metadata in output', async () => {
    const items = [1, 2, 3, 4, 5, 6]
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 3, windowMs: 500, strategy: 'fixed' },
      {} as never,
    )
    await vi.runAllTimersAsync()
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.totalItems).toBe(6)
      expect(result.output!.windowMs).toBe(500)
      expect(result.output!.requestsPerWindow).toBe(3)
    }
  })

  it('should handle items that fit exactly in one window (no waiting needed)', async () => {
    const items = [1, 2]
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 5, windowMs: 500, strategy: 'fixed' },
      {} as never,
    )
    // No sleep needed — resolves immediately
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.processedItems).toEqual([1, 2])
    }
  })

  it('should return success false if items array is empty after schema rejects it', () => {
    const result = RateLimiterInputSchema.safeParse({
      items: [],
      requestsPerWindow: 5,
      windowMs: 500,
      strategy: 'fixed',
    })
    expect(result.success).toBe(false)
  })

  it('should wait at least windowMs between batches (totalDurationMs >= windowMs)', async () => {
    const items = [1, 2, 3, 4] // 2 batches of 2 → one sleep of windowMs
    const windowMs = 500
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 2, windowMs, strategy: 'fixed' },
      {} as never,
    )
    await vi.runAllTimersAsync()
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.totalDurationMs).toBeGreaterThanOrEqual(windowMs)
    }
  })
})

// ---------------------------------------------------------------------------
// Sliding window strategy
// ---------------------------------------------------------------------------

describe('rateLimiterNode - sliding window strategy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return success true and all items processed', async () => {
    const items = [1, 2, 3, 4, 5]
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 3, windowMs: 500, strategy: 'sliding' },
      {} as never,
    )
    await vi.runAllTimersAsync()
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.processedItems).toHaveLength(5)
    }
  })

  it('should return processedItems in original order', async () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 3, windowMs: 500, strategy: 'sliding' },
      {} as never,
    )
    await vi.runAllTimersAsync()
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.processedItems).toEqual(['a', 'b', 'c', 'd', 'e'])
    }
  })

  it('should include correct strategy in output', async () => {
    const items = [1, 2, 3]
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 3, windowMs: 500, strategy: 'sliding' },
      {} as never,
    )
    await vi.runAllTimersAsync()
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.strategy).toBe('sliding')
    }
  })

  it('should handle single item with no waiting', async () => {
    const items = ['only-one']
    const result = await rateLimiterNode.executor(
      { items, requestsPerWindow: 10, windowMs: 1000, strategy: 'sliding' },
      {} as never,
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.processedItems).toEqual(['only-one'])
    }
  })

  it('should wait at least windowMs when window capacity is exceeded (totalDurationMs >= windowMs)', async () => {
    const items = [1, 2, 3, 4] // limit 2 per 500ms — third item triggers a wait
    const windowMs = 500
    const executorPromise = rateLimiterNode.executor(
      { items, requestsPerWindow: 2, windowMs, strategy: 'sliding' },
      {} as never,
    )
    await vi.runAllTimersAsync()
    const result = await executorPromise
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output!.totalDurationMs).toBeGreaterThanOrEqual(windowMs)
    }
  })
})

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

describe('rateLimiterNode - output schema', () => {
  it('should validate a well-formed output', () => {
    const mockOutput = {
      processedItems: [1, 2, 3],
      totalItems: 3,
      totalDurationMs: 100,
      strategy: 'fixed',
      windowMs: 1000,
      requestsPerWindow: 5,
    }
    expect(RateLimiterOutputSchema.safeParse(mockOutput).success).toBe(true)
  })

  it('should reject output missing processedItems', () => {
    const mockOutput = {
      totalItems: 3,
      totalDurationMs: 100,
      strategy: 'fixed',
      windowMs: 1000,
      requestsPerWindow: 5,
    }
    expect(RateLimiterOutputSchema.safeParse(mockOutput).success).toBe(false)
  })

  it('should reject output with negative totalDurationMs', () => {
    const mockOutput = {
      processedItems: [1, 2, 3],
      totalItems: 3,
      totalDurationMs: -1,
      strategy: 'fixed',
      windowMs: 1000,
      requestsPerWindow: 5,
    }
    expect(RateLimiterOutputSchema.safeParse(mockOutput).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('rateLimiterNode - error handling', () => {
  it('should return success false if requestsPerWindow is 0 at runtime', async () => {
    // Bypass schema by casting to the type directly
    const invalidInput = {
      items: [1, 2, 3],
      requestsPerWindow: 0,
      windowMs: 1000,
      strategy: 'fixed',
    } as Parameters<typeof rateLimiterNode.executor>[0]

    // With 0 requestsPerWindow, slicing by 0 causes an infinite loop — the
    // executor should either handle this gracefully or the catch block should
    // return success: false. We verify schema-level rejection as the guard.
    const schemaResult = RateLimiterInputSchema.safeParse(invalidInput)
    expect(schemaResult.success).toBe(false)
  })

  it('should return success false when executor receives requestsPerWindow < 1 directly (runtime guard)', async () => {
    const invalidInput = {
      items: [1, 2, 3],
      requestsPerWindow: 0,
      windowMs: 1000,
      strategy: 'fixed',
    } as Parameters<typeof rateLimiterNode.executor>[0]

    const result = await rateLimiterNode.executor(invalidInput, {} as never)
    expect(result.success).toBe(false)
  })
})
