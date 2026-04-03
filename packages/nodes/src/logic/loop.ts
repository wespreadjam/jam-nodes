import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Input schema for loop node
 */
export const LoopInputSchema = z.object({
  /** Array of items to iterate over */
  items: z.array(z.unknown()),
  /** Max parallel executions (default: 1 for sequential) */
  concurrency: z.number().min(1).max(100).default(1),
  /** Delay between iterations in milliseconds */
  delayMs: z.number().min(0).max(60000).default(0),
  /** Continue processing remaining items if one fails */
  continueOnError: z.boolean().default(false),
});

export type LoopInput = z.infer<typeof LoopInputSchema>;

/**
 * Error entry for a failed iteration
 */
export const LoopErrorSchema = z.object({
  index: z.number(),
  error: z.string(),
});

export type LoopError = z.infer<typeof LoopErrorSchema>;

/**
 * Output schema for loop node
 */
export const LoopOutputSchema = z.object({
  results: z.array(z.unknown()),
  errors: z.array(LoopErrorSchema).optional(),
});

export type LoopOutput = z.infer<typeof LoopOutputSchema>;

/**
 * Sleep utility for rate limiting between iterations
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process items sequentially with optional delay
 */
async function processSequential(
  items: unknown[],
  delayMs: number,
  continueOnError: boolean
): Promise<{ results: unknown[]; errors: LoopError[] }> {
  const results: unknown[] = [];
  const errors: LoopError[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      results.push(items[i]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({ index: i, error: errorMsg });
      if (!continueOnError) {
        break;
      }
      results.push(null);
    }

    if (delayMs > 0 && i < items.length - 1) {
      await sleep(delayMs);
    }
  }

  return { results, errors };
}

/**
 * Process items with concurrency limit and optional delay
 */
async function processConcurrent(
  items: unknown[],
  concurrency: number,
  delayMs: number,
  continueOnError: boolean
): Promise<{ results: unknown[]; errors: LoopError[] }> {
  const results: unknown[] = new Array(items.length).fill(null);
  const errors: LoopError[] = [];
  let stopped = false;

  // Process in batches of `concurrency`
  for (let batchStart = 0; batchStart < items.length; batchStart += concurrency) {
    if (stopped) break;

    const batchEnd = Math.min(batchStart + concurrency, items.length);
    const batch = items.slice(batchStart, batchEnd);

    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = batchStart + batchIndex;
      try {
        results[globalIndex] = item;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push({ index: globalIndex, error: errorMsg });
        if (!continueOnError) {
          stopped = true;
        }
      }
    });

    await Promise.all(batchPromises);

    if (delayMs > 0 && batchEnd < items.length && !stopped) {
      await sleep(delayMs);
    }
  }

  return { results, errors };
}

/**
 * Loop node - iterate over an array of items with rate limiting and concurrency control.
 *
 * Processes each item in the array, supporting both sequential and parallel execution.
 * In a workflow context, the execution engine handles running child nodes for each item;
 * this node manages the iteration, concurrency, delay, and error tracking.
 *
 * @example
 * ```typescript
 * // Sequential with rate limiting
 * {
 *   items: ['a@example.com', 'b@example.com'],
 *   delayMs: 200,
 *   continueOnError: true
 * }
 *
 * // Parallel with concurrency limit
 * {
 *   items: [1, 2, 3, 4, 5],
 *   concurrency: 3,
 *   delayMs: 100
 * }
 * ```
 */
export const loopNode = defineNode({
  type: 'loop',
  name: 'Loop',
  description: 'Iterate over an array of items with rate limiting and concurrency control',
  category: 'logic',
  inputSchema: LoopInputSchema,
  outputSchema: LoopOutputSchema,
  capabilities: {
    supportsRerun: true,
    supportsCancel: true,
  },
  executor: async (input) => {
    try {
      if (!Array.isArray(input.items) || input.items.length === 0) {
        return {
          success: true,
          output: {
            results: [],
            errors: [],
          },
        };
      }

      const { results, errors } =
        input.concurrency === 1
          ? await processSequential(input.items, input.delayMs, input.continueOnError)
          : await processConcurrent(
              input.items,
              input.concurrency,
              input.delayMs,
              input.continueOnError
            );

      return {
        success: true,
        output: {
          results,
          errors: errors.length > 0 ? errors : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Loop operation failed',
      };
    }
  },
});
