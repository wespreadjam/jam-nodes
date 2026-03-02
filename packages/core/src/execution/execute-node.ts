import type { NodeDefinition, NodeExecutionContext, NodeExecutionResult } from '../types/node.js';
import type { ExecutionConfig } from '../types/execution.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a single node with optional retry, caching, and timeout.
 *
 * Input is validated against the node's inputSchema before execution.
 * When caching is enabled, successful results are stored and returned
 * on subsequent calls with the same input.
 *
 * @param node - The node definition to execute
 * @param input - Raw input (validated against node.inputSchema)
 * @param context - Execution context passed to the node executor
 * @param config - Optional retry, cache, timeout, and signal configuration
 */
export async function executeNode<TInput, TOutput>(
  node: NodeDefinition<TInput, TOutput>,
  input: unknown,
  context: NodeExecutionContext,
  config?: ExecutionConfig,
): Promise<NodeExecutionResult<TOutput>> {
  const validatedInput = node.inputSchema.parse(input) as TInput;

  if (config?.cache?.enabled) {
    const { store, ttlMs, keyFn } = config.cache;
    const cacheKey = (keyFn ?? defaultKeyFn)(validatedInput);
    const cached = await store.get<NodeExecutionResult<TOutput>>(cacheKey);
    if (cached) return cached;

    const result = await executeWithRetry(node, validatedInput, context, config);

    if (result.success) {
      await store.set(cacheKey, result, ttlMs);
    }

    return result;
  }

  return executeWithRetry(node, validatedInput, context, config);
}

function defaultKeyFn(input: unknown): string {
  return JSON.stringify(input);
}

async function executeWithRetry<TInput, TOutput>(
  node: NodeDefinition<TInput, TOutput>,
  input: TInput,
  context: NodeExecutionContext,
  config?: ExecutionConfig,
): Promise<NodeExecutionResult<TOutput>> {
  const maxAttempts = config?.retry?.maxAttempts ?? 1;
  const backoffMs = config?.retry?.backoffMs ?? 0;
  const backoffMultiplier = config?.retry?.backoffMultiplier ?? 2;
  const maxBackoffMs = config?.retry?.maxBackoffMs ?? Infinity;
  const retryOn = config?.retry?.retryOn;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (config?.signal?.aborted) {
      return { success: false, error: 'Execution aborted' };
    }

    try {
      const result = await executeWithTimeout(node, input, context, config);

      // A non-success result with an error is treated as a retriable failure
      if (!result.success && result.error && attempt < maxAttempts) {
        const error = new Error(result.error);
        if (!retryOn || retryOn(error)) {
          lastError = error;
          config?.onRetry?.(attempt, error);
          const delay = Math.min(backoffMs * Math.pow(backoffMultiplier, attempt - 1), maxBackoffMs);
          await sleep(delay);
          continue;
        }
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      if (attempt < maxAttempts && (!retryOn || retryOn(error))) {
        config?.onRetry?.(attempt, error);
        const delay = Math.min(backoffMs * Math.pow(backoffMultiplier, attempt - 1), maxBackoffMs);
        await sleep(delay);
        continue;
      }

      return { success: false, error: error.message };
    }
  }

  return { success: false, error: lastError?.message ?? 'Execution failed' };
}

async function executeWithTimeout<TInput, TOutput>(
  node: NodeDefinition<TInput, TOutput>,
  input: TInput,
  context: NodeExecutionContext,
  config?: ExecutionConfig,
): Promise<NodeExecutionResult<TOutput>> {
  const timeoutMs = config?.timeout;
  const signal = config?.signal;

  if (!timeoutMs && !signal) {
    return node.executor(input, context);
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const promises: Promise<NodeExecutionResult<TOutput>>[] = [
    node.executor(input, context),
  ];

  if (timeoutMs) {
    promises.push(
      new Promise<NodeExecutionResult<TOutput>>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Execution timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    );
  }

  if (signal) {
    promises.push(
      new Promise<NodeExecutionResult<TOutput>>((_, reject) => {
        if (signal.aborted) {
          reject(new Error('Execution aborted'));
          return;
        }
        signal.addEventListener('abort', () => reject(new Error('Execution aborted')), { once: true });
      }),
    );
  }

  try {
    return await Promise.race(promises);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
