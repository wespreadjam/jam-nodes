/**
 * HTTP utilities for making API calls with retry logic, timeouts, and rate limiting.
 */

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Configuration for fetch with retry
 */
export interface FetchWithRetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  backoffMs?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Error thrown when all retry attempts are exhausted
 */
export class FetchRetryError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'FetchRetryError';
  }
}

/**
 * Fetch with automatic retry, timeout, and rate limit handling.
 *
 * Features:
 * - Exponential backoff on rate limits (429) and server errors (5xx)
 * - Configurable timeout
 * - Respects Retry-After header
 * - Does not retry on auth errors (401, 403) or client errors (4xx)
 *
 * @param url - URL to fetch
 * @param options - Fetch options (same as native fetch)
 * @param config - Retry and timeout configuration
 * @returns Promise resolving to Response
 * @throws FetchRetryError if all retries exhausted or non-retryable error
 *
 * @example
 * ```typescript
 * const response = await fetchWithRetry(
 *   'https://api.example.com/data',
 *   {
 *     method: 'POST',
 *     headers: { 'Authorization': 'Bearer token' },
 *     body: JSON.stringify({ key: 'value' })
 *   },
 *   { maxRetries: 3, timeoutMs: 30000 }
 * );
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: FetchWithRetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, backoffMs = 1000, timeoutMs = 30000 } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Don't retry on auth errors
      if (response.status === 401 || response.status === 403) {
        const errorText = await response.text();
        throw new FetchRetryError(
          `Authentication error: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : backoffMs * Math.pow(2, attempt);

        if (attempt < maxRetries - 1) {
          await sleep(delayMs);
          continue;
        }

        // All retries exhausted — throw instead of returning the 429 response
        const errorText = await response.text();
        throw new FetchRetryError(
          `Rate limit exceeded after ${maxRetries} attempts`,
          429,
          errorText
        );
      }

      // Retry on server errors
      if (response.status >= 500 && response.status < 600) {
        if (attempt < maxRetries - 1) {
          await sleep(backoffMs * Math.pow(2, attempt));
          continue;
        }
        const errorText = await response.text();
        throw new FetchRetryError(
          `Server error: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      // Return response for success or client errors (let caller handle)
      return response;
    } catch (error) {
      clearTimeout(timeout);

      // Don't retry abort errors (timeout) on last attempt
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new FetchRetryError('Request timed out');
        if (attempt < maxRetries - 1) {
          await sleep(backoffMs * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      // Re-throw FetchRetryError (auth errors, etc.)
      if (error instanceof FetchRetryError) {
        throw error;
      }

      // Network errors - retry
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError || new FetchRetryError('Max retries exceeded');
}

/**
 * Parse JSON response with error handling
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new FetchRetryError(
      `HTTP error: ${response.status} ${response.statusText}`,
      response.status,
      errorText
    );
  }

  return response.json() as Promise<T>;
}
