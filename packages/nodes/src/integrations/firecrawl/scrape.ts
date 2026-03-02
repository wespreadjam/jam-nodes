import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';

// =============================================================================
// Constants
// =============================================================================

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v2';

// =============================================================================
// Firecrawl API Types
// =============================================================================

interface ScrapeResponse {
  success: boolean;
  data: {
    markdown?: string;
    summary?: string | null;
    html?: string | null;
    rawHtml?: string | null;
    screenshot?: string | null;
    links?: string[];
    actions?: {
      screenshots?: string[];
      scrapes?: { url: string; html: string }[];
      javascriptReturns?: { type: string; value: unknown }[];
      pdfs?: string[];
    } | null;
    metadata?: {
      title?: string | string[];
      description?: string | string[];
      language?: string | string[] | null;
      sourceURL?: string;
      url?: string;
      keywords?: string | string[];
      ogLocaleAlternate?: string[];
      statusCode?: number;
      error?: string | null;
      [key: string]: unknown;
    };
    warning?: string | null;
    changeTracking?: {
      previousScrapeAt?: string;
      changeStatus?: 'new' | 'same' | 'changed' | 'removed';
      visibility?: 'visible' | 'hidden';
      diff?: string | null;
      json?: Record<string, unknown>;
    } | null;
    branding?: Record<string, unknown> | null;
  };
}

// =============================================================================
// Schemas
// =============================================================================

export const FirecrawlScrapeInputSchema = z.object({
  /** URL to scrape */
  url: z.string().url(),
  /** Output formats to include in the response */
  formats: z.array(z.union([
    z.enum(['markdown', 'summary', 'html', 'rawHtml', 'links', 'images', 'branding']),
    z.object({
      type: z.literal('screenshot'),
      /** Whether to capture a full-page screenshot or limit to the current viewport */
      fullPage: z.boolean().default(false),
      /** Quality of the screenshot, from 1 to 100 */
      quality: z.number().int().min(1).max(100).optional(),
      /** Viewport dimensions for the screenshot */
      viewport: z.object({
        width: z.number().int(),
        height: z.number().int(),
      }).optional(),
    }),
    z.object({
      type: z.literal('json'),
      /** JSON Schema object defining the output structure */
      schema: z.record(z.unknown()).optional(),
      /** Prompt to guide extraction behavior */
      prompt: z.string().optional(),
    }),
    z.object({
      type: z.literal('changeTracking'),
      /** Tracking modes */
      modes: z.array(z.enum(['git-diff', 'json'])).optional(),
      /** JSON Schema object for json mode */
      schema: z.record(z.unknown()).optional(),
      /** Prompt for extraction instructions */
      prompt: z.string().optional(),
      /** Tag for branching history */
      tag: z.string().nullable().default(null),
    }),
  ])).default(() => ['markdown' as const]),
  /** Return only the main content and exclude headers, navs, footers, etc */
  onlyMainContent: z.boolean().default(true),
  /** Delay in ms before fetching content to allow dynamic page loading */
  waitFor: z.number().int().default(0),
});

export type FirecrawlScrapeInput = z.infer<typeof FirecrawlScrapeInputSchema>;

export const FirecrawlScrapeOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    markdown: z.string().optional(),
    summary: z.string().nullable().optional(),
    html: z.string().nullable().optional(),
    rawHtml: z.string().nullable().optional(),
    screenshot: z.string().nullable().optional(),
    links: z.array(z.string()).optional(),
    actions: z.object({
      screenshots: z.array(z.string()).optional(),
      scrapes: z.array(z.object({
        url: z.string(),
        html: z.string(),
      })).optional(),
      javascriptReturns: z.array(z.object({
        type: z.string(),
        value: z.unknown(),
      })).optional(),
      pdfs: z.array(z.string()).optional(),
    }).nullable().optional(),
    metadata: z.object({
      title: z.union([z.string(), z.array(z.string())]).optional(),
      description: z.union([z.string(), z.array(z.string())]).optional(),
      language: z.union([z.string(), z.array(z.string())]).nullable().optional(),
      sourceURL: z.string().optional(),
      url: z.string().optional(),
      keywords: z.union([z.string(), z.array(z.string())]).optional(),
      ogLocaleAlternate: z.array(z.string()).optional(),
      statusCode: z.number().int().optional(),
      error: z.string().nullable().optional(),
    }).passthrough().optional(),
    warning: z.string().nullable().optional(),
    changeTracking: z.object({
      previousScrapeAt: z.string().optional(),
      changeStatus: z.enum(["new", "same", "changed", "removed"]).optional(),
      visibility: z.enum(["visible", "hidden"]).optional(),
      diff: z.string().nullable().optional(),
      json: z.record(z.string(), z.unknown()).optional(),
    }).nullable().optional(),
    branding: z.object({
      colorScheme: z.enum(["light", "dark"]).optional(),
      logo: z.string().optional(),
      colors: z.object({
        primary: z.string().optional(),
        secondary: z.string().optional(),
        accent: z.string().optional(),
        background: z.string().optional(),
        textPrimary: z.string().optional(),
        textSecondary: z.string().optional(),
        link: z.string().optional(),
        success: z.string().optional(),
        warning: z.string().optional(),
        error: z.string().optional(),
      }).optional(),
      fonts: z.array(z.object({
        family: z.string().optional(),
      })).optional(),
      typography: z.object({
        fontFamilies: z.object({
          primary: z.string().optional(),
          heading: z.string().optional(),
          code: z.string().optional(),
        }).optional(),
        fontSizes: z.object({
          h1: z.string().optional(),
          h2: z.string().optional(),
          h3: z.string().optional(),
          body: z.string().optional(),
        }).optional(),
        fontWeights: z.object({
          light: z.number().optional(),
          regular: z.number().optional(),
          medium: z.number().optional(),
          bold: z.number().optional(),
        }).optional(),
        lineHeights: z.object({
          heading: z.string().optional(),
          body: z.string().optional(),
        }).optional(),
      }).optional(),
      spacing: z.object({
        baseUnit: z.number().optional(),
        borderRadius: z.string().optional(),
        padding: z.record(z.string(), z.unknown()).optional(),
        margins: z.record(z.string(), z.unknown()).optional(),
      }).optional(),
      components: z.object({
        buttonPrimary: z.object({
          background: z.string().optional(),
          textColor: z.string().optional(),
          borderRadius: z.string().optional(),
        }).optional(),
        buttonSecondary: z.object({
          background: z.string().optional(),
          textColor: z.string().optional(),
          borderColor: z.string().optional(),
          borderRadius: z.string().optional(),
        }).optional(),
        input: z.record(z.string(), z.unknown()).optional(),
      }).optional(),
      icons: z.record(z.string(), z.unknown()).optional(),
      images: z.object({
        logo: z.string().optional(),
        favicon: z.string().optional(),
        ogImage: z.string().optional(),
      }).optional(),
      animations: z.record(z.string(), z.unknown()).optional(),
      layout: z.record(z.string(), z.unknown()).optional(),
      personality: z.record(z.string(), z.unknown()).optional(),
    }).nullable().optional(),
  }),
});

export type FirecrawlScrapeOutput = z.infer<typeof FirecrawlScrapeOutputSchema>;

// =============================================================================
// Firecrawl API Functions
// =============================================================================

/**
 * Scrape a single URL via Firecrawl (POST /v2/scrape)
 */
async function scrapePage(
  bearerToken: string,
  params: {
    url: string;
    formats?: unknown[];
    onlyMainContent?: boolean;
    waitFor?: number;
  }
): Promise<ScrapeResponse> {
  const requestBody: Record<string, unknown> = {
    url: params.url,
    ...(params.formats && { formats: params.formats }),
    ...(params.onlyMainContent != null && { onlyMainContent: params.onlyMainContent }),
    ...(params.waitFor && { waitFor: params.waitFor }),
  };

  const response = await fetchWithRetry(
    `${FIRECRAWL_API_BASE}/scrape`,
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
    throw new Error(`Firecrawl scrape error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// =============================================================================
// Node Definition
// =============================================================================

/**
 * Firecrawl Scrape Node
 *
 * Scrapes a single URL and extracts content using the Firecrawl API.
 * Supports multiple output formats including markdown, HTML, screenshots,
 * structured JSON extraction, and change tracking.
 *
 * @example
 * ```typescript
 * const result = await firecrawlScrapeNode.executor({
 *   url: 'https://example.com',
 *   formats: ['markdown'],
 *   onlyMainContent: true,
 * }, context);
 * ```
 */
export const firecrawlScrapeNode = defineNode({
  type: 'firecrawl_scrape',
  name: 'Firecrawl Scrape',
  description: 'Scrape a single URL and extract its content using Firecrawl',
  category: 'integration',
  inputSchema: FirecrawlScrapeInputSchema,
  outputSchema: FirecrawlScrapeOutputSchema,
  estimatedDuration: 15,
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

      // Scrape URL
      const result = await scrapePage(bearerToken, {
        url: input.url,
        formats: input.formats,
        onlyMainContent: input.onlyMainContent,
        waitFor: input.waitFor,
      });

      return {
        success: true,
        output: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape URL',
      };
    }
  },
});