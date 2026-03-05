import { z } from 'zod'
import { defineNode } from '@jam-nodes/core'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const RateLimiterInputSchema = z.object({
  items: z.array(z.unknown()).min(1, 'At least one item is required'),
  requestsPerWindow: z.number().int().min(1).max(10000),
  windowMs: z.number().int().min(100).max(3600000),
  strategy: z.enum(['fixed', 'sliding']),
})

export type RateLimiterInput = z.infer<typeof RateLimiterInputSchema>

export const RateLimiterOutputSchema = z.object({
  processedItems: z.array(z.unknown()),
  totalItems: z.number(),
  totalDurationMs: z.number().min(0),
  strategy: z.string(),
  windowMs: z.number(),
  requestsPerWindow: z.number(),
})

export type RateLimiterOutput = z.infer<typeof RateLimiterOutputSchema>

export const rateLimiterNode = defineNode({
  type: 'rate_limiter',
  name: 'Rate Limiter',
  description:
    'Process items while respecting API rate limits using fixed or sliding window strategies',
  category: 'logic',
  inputSchema: RateLimiterInputSchema,
  outputSchema: RateLimiterOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
    supportsCancel: false,
  },
  executor: async (input) => {
    if (input.requestsPerWindow < 1) {
      return { success: false, error: 'requestsPerWindow must be at least 1' }
    }
    try {
      const startTime = Date.now()
      const allProcessedItems: unknown[] = []

      if (input.strategy === 'fixed') {
        const batchSize = input.requestsPerWindow
        const items = input.items
        for (let i = 0; i < items.length; i += batchSize) {
          const chunkIndex = Math.floor(i / batchSize)
          if (chunkIndex > 0) {
            await sleep(input.windowMs)
          }
          const chunk = items.slice(i, i + batchSize)
          for (const item of chunk) {
            allProcessedItems.push(item)
          }
        }
      } else {
        // sliding window
        const timestamps: number[] = []
        for (const item of input.items) {
          let now = Date.now()
          // Prune expired timestamps
          while (
            timestamps.length > 0 &&
            timestamps[0]! < now - input.windowMs
          ) {
            timestamps.shift()
          }
          if (timestamps.length >= input.requestsPerWindow) {
            const waitMs = timestamps[0]! + input.windowMs - now
            if (waitMs > 0) {
              await sleep(waitMs)
            }
            // Prune again after waking
            now = Date.now()
            while (
              timestamps.length > 0 &&
              timestamps[0]! < now - input.windowMs
            ) {
              timestamps.shift()
            }
          }
          timestamps.push(Date.now())
          allProcessedItems.push(item)
        }
      }

      return {
        success: true,
        output: {
          processedItems: allProcessedItems,
          totalItems: allProcessedItems.length,
          totalDurationMs: Date.now() - startTime,
          strategy: input.strategy,
          windowMs: input.windowMs,
          requestsPerWindow: input.requestsPerWindow,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rate limiter failed',
      }
    }
  },
})
