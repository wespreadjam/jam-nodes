import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry, sleep } from '../../utils/http.js';

// =============================================================================
// Constants
// =============================================================================

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v2';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // 5 minutes at 2s intervals

// =============================================================================
// Firecrawl API Types
// =============================================================================

interface ExtractPostResponse {
  success: boolean;
  id: string;
  invalidURLs?: string[] | null;
}

interface ExtractGetResponse {
  success: boolean;
  status: 'completed' | 'processing' | 'failed' | 'cancelled';
  data: Record<string, unknown>;
  expiresAt?: string;
  tokensUsed?: number;
}

// =============================================================================
// Schemas
// =============================================================================

export const FirecrawlExtractInputSchema = z.object({
  /** URLs to extract data from (supports glob patterns) */
  urls: z.array(z.string()).min(1),
  /** Prompt to guide the extraction process */
  prompt: z.string().optional(),
  /** JSON Schema defining the structure of the extracted data */
  schema: z.record(z.unknown()).optional(),
});

export type FirecrawlExtractInput = z.infer<typeof FirecrawlExtractInputSchema>;

export const FirecrawlExtractOutputSchema = z.object({
  success: z.boolean(),
  status: z.enum(['completed', 'failed', 'cancelled']),
  /** Extracted data matching the provided schema */
  data: z.record(z.unknown()),
  /** Number of tokens used by the extract job */
  tokensUsed: z.number().int().optional(),
  expiresAt: z.string().optional(),
});

export type FirecrawlExtractOutput = z.infer<typeof FirecrawlExtractOutputSchema>;

// =============================================================================
// Firecrawl API Functions
// =============================================================================

/**
 * Start a Firecrawl extract job (POST /v2/extract)
 */
async function startExtractJob(
  bearerToken: string,
  params: {
    urls: string[];
    prompt?: string;
    schema?: Record<string, unknown>;
  }
): Promise<ExtractPostResponse> {
  const requestBody: Record<string, unknown> = {
    urls: params.urls,
    ...(params.prompt && { prompt: params.prompt }),
    ...(params.schema && { schema: params.schema }),
  };

  const response = await fetchWithRetry(
    `${FIRECRAWL_API_BASE}/extract`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(requestBody),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firecrawl extract POST error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Poll a Firecrawl extract job until completion (GET /v2/extract/:id)
 */
async function pollExtractJob(
  bearerToken: string,
  jobId: string
): Promise<ExtractGetResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetchWithRetry(
      `${FIRECRAWL_API_BASE}/extract/${jobId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
      { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl extract GET error: ${response.status} - ${errorText}`);
    }

    const result: ExtractGetResponse = await response.json();

    if (result.status === 'completed' || result.status === 'failed' || result.status === 'cancelled') {
      return result;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Firecrawl extract timed out waiting for completion');
}

// =============================================================================
// Node Definition
// =============================================================================

/**
 * Firecrawl Extract Node
 *
 * Extracts structured data from one or more URLs using AI-powered extraction.
 * Starts an extract job then polls until completion.
 *
 * @example
 * ```typescript
 * const result = await firecrawlExtractNode.executor({
 *   urls: ['https://example.com/pricing'],
 *   prompt: 'Extract the pricing plans with their features',
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       plans: {
 *         type: 'array',
 *         items: {
 *           type: 'object',
 *           properties: {
 *             name: { type: 'string' },
 *             price: { type: 'number' },
 *             features: { type: 'array', items: { type: 'string' } },
 *           },
 *         },
 *       },
 *     },
 *   },
 * }, context);
 * ```
 */
export const firecrawlExtractNode = defineNode({
  type: 'firecrawl_extract',
  name: 'Firecrawl Extract',
  description: 'Extract structured data from URLs using AI-powered extraction via Firecrawl',
  category: 'integration',
  inputSchema: FirecrawlExtractInputSchema,
  outputSchema: FirecrawlExtractOutputSchema,
  estimatedDuration: 30,
  capabilities: {
    supportsRerun: true,
    supportsCancel: true,
  },

  executor: async (input, context) => {
    try {
      // Check for Bearer Token
      const bearerToken = context.credentials?.firecrawl?.bearerToken;
      if (!bearerToken) {
        return {
          success: false,
          error: 'Firecrawl Bearer Token not configured. Please provide context.credentials.firecrawl.bearerToken.',
        };
      }

      // Start extraction job
      const job = await startExtractJob(bearerToken, {
        urls: input.urls,
        prompt: input.prompt,
        schema: input.schema,
      });

      if (!job.success) {
        return {
          success: false,
          error: 'Failed to start Firecrawl extract job',
        };
      }

      // Poll extraction jobs for extracted data
      const result = await pollExtractJob(bearerToken, job.id);
      const status = result.status as 'completed' | 'failed' | 'cancelled';

      return {
        success: true,
        output: {
          success: result.success,
          status,
          data: result.data,
          tokensUsed: result.tokensUsed,
          expiresAt: result.expiresAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract data',
      };
    }
  },
});