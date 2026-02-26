import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry, sleep } from '../../utils/http.js';

// =============================================================================
// Constants
// =============================================================================

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v2';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 300; // 10 minutes at 2s intervals

// =============================================================================
// Firecrawl API Types
// =============================================================================

interface CrawlPostResponse {
  success: boolean;
  id: string;
  url: string;
}

interface CrawlPageData {
  markdown?: string;
  html?: string | null;
  rawHtml?: string | null;
  links?: string[];
  screenshot?: string | null;
  metadata?: {
    title?: string | string[];
    description?: string | string[];
    language?: string | string[];
    sourceURL?: string;
    url?: string;
    keywords: string | string[];
    statusCode?: number;
    error?: string | null;
    [key: string]: unknown; // Any other metadata scraped
  };
}

interface CrawlGetResponse {
  status: 'scraping' | 'completed' | 'failed';
  total: number;
  completed: number;
  creditsUsed: number;
  expiresAt: string;
  next?: string | null;
  data: CrawlPageData[];
}

// =============================================================================
// Schemas
// =============================================================================

export const FirecrawlCrawlInputSchema = z.object({
  /** The base URL to start crawling from */
  url: z.string().url(),
  /** URL pathname regex patterns to exclude from crawling */
  excludePaths: z.array(z.string()).optional(),
  /** URL pathname regex patterns to include in crawling */
  includePaths: z.array(z.string()).optional(),
  /** Maximum depth based on discovery order */
  maxDiscoveryDepth: z.number().int().optional(),
  /** Maximum number of pages to crawl */
  limit: z.number().int().default(10000),
});

export type FirecrawlCrawlInput = z.infer<typeof FirecrawlCrawlInputSchema>;

export const FirecrawlCrawlOutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  total: z.number(),
  completed: z.number(),
  creditsUsed: z.number(),
  expiresAt: z.string(),
  data: z.array(z.object({
    markdown: z.string().optional(),
    html: z.string().nullable().optional(),
    rawHtml: z.string().nullable().optional(),
    links: z.array(z.string()).optional(),
    screenshot: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
  })),
});

export type FirecrawlCrawlOutput = z.infer<typeof FirecrawlCrawlOutputSchema>;

// =============================================================================
// Firecrawl API Functions
// =============================================================================

/**
 * Start a Firecrawl crawl job (POST /v2/crawl)
 */
async function startCrawlJob(
  bearerToken: string,
  params: {
    url: string;
    excludePaths?: string[];
    includePaths?: string[];
    maxDiscoveryDepth?: number;
    limit?: number;
  }
): Promise<CrawlPostResponse> {
  const requestBody: Record<string, unknown> = {
    url: params.url,
    ...(params.excludePaths && { excludePaths: params.excludePaths }),
    ...(params.includePaths && { includePaths: params.includePaths }),
    ...(params.maxDiscoveryDepth != null && { maxDiscoveryDepth: params.maxDiscoveryDepth }),
    ...(params.limit != null && { limit: params.limit })
  }

  const response = await fetchWithRetry(
    `${FIRECRAWL_API_BASE}/crawl`,
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
    throw new Error(`Firecrawl crawl POST error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Poll a Firecrawl crawl job until completion (GET /v2/crawl/:id)
 */
async function pollCrawlJob(
  bearerToken: string,
  jobId: string
): Promise<CrawlGetResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetchWithRetry(
      `${FIRECRAWL_API_BASE}/crawl/${jobId}`,
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
      throw new Error(`Firecrawl crawl GET error: ${response.status} - ${errorText}`);
    }

    const result: CrawlGetResponse = await response.json();

    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Firecrawl crawl timed out waiting for completion');
}

// =============================================================================
// Node Definition
// =============================================================================

/**
 * Firecrawl Crawl Node
 *
 * Crawls a website starting from a base URL, following links and scraping
 * each discovered page. Starts a crawl job then polls until completion.
 *
 * @example
 * ```typescript
 * const result = await firecrawlCrawlNode.executor({
 *   url: 'https://example.com',
 *   limit: 50,
 *   includePaths: ['/docs/.*'],
 * }, context);
 * ```
 */
export const firecrawlCrawlNode = defineNode({
  type: 'firecrawl_crawl',
  name: 'Firecrawl Crawl',
  description: 'Crawl a website and extract content from all discovered pages using Firecrawl',
  category: 'integration',
  inputSchema: FirecrawlCrawlInputSchema,
  outputSchema: FirecrawlCrawlOutputSchema,
  estimatedDuration: 60,
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

      // Start crawling job
      const job = await startCrawlJob(bearerToken, {
        url: input.url,
        excludePaths: input.excludePaths,
        includePaths: input.includePaths,
        maxDiscoveryDepth: input.maxDiscoveryDepth,
        limit: input.limit,
      });

      if (!job.success) {
        return {
          success: false,
          error: 'Failed to start Firecrawl crawl job',
        };
      }

      // Poll crawl jobs for scraped website data
      const result = await pollCrawlJob(bearerToken, job.id);
      const status = result.status as 'completed' | 'failed';

      return {
        success: true,
        output: {
          status,
          total: result.total,
          completed: result.completed,
          creditsUsed: result.creditsUsed,
          expiresAt: result.expiresAt,
          data: result.data,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to crawl URL',
      };
    }
  },
});