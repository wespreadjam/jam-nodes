import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';

// =============================================================================
// Constants
// =============================================================================

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// =============================================================================
// Types
// =============================================================================

export interface SeoIssue {
  id: string;
  title: string;
  description: string;
  score: number;
  displayValue?: string;
}

interface OnPageCheck {
  passed: boolean;
  description?: string;
  score: number;
}

interface DataForSEOOnPageResponse {
  status_code: number;
  status_message: string;
  cost?: number;
  tasks?: Array<{
    result?: Array<{
      items?: Array<{
        onpage_score?: number;
        checks?: Record<string, OnPageCheck>;
        meta?: {
          title?: string;
          description?: string;
          canonical?: string;
          htags?: Record<string, string[]>;
        };
      }>;
    }>;
  }>;
}

// =============================================================================
// Schemas
// =============================================================================

export const SeoAuditInputSchema = z.object({
  /** URL to audit */
  url: z.string().url().optional(),
});

export type SeoAuditInput = z.infer<typeof SeoAuditInputSchema>;

export const SeoAuditOutputSchema = z.object({
  overallScore: z.number().nullable(),
  issues: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    score: z.number(),
    displayValue: z.string().optional(),
  })),
  passedAudits: z.number(),
  failedAudits: z.number(),
  url: z.string().nullable(),
  skipped: z.boolean().optional(),
  awaitingUrl: z.boolean().optional(),
  meta: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    canonical: z.string().optional(),
    htags: z.record(z.array(z.string())).optional(),
  }).optional(),
  performance: z.object({
    timeToInteractive: z.number().optional(),
    largestContentfulPaint: z.number().optional(),
    domComplete: z.number().optional(),
  }).optional(),
  links: z.object({
    internal: z.number(),
    external: z.number(),
    broken: z.number(),
  }).optional(),
  resources: z.object({
    images: z.number(),
    scripts: z.number(),
    stylesheets: z.number(),
  }).optional(),
  content: z.object({
    wordCount: z.number(),
    textRatio: z.number(),
    readabilityScore: z.number().optional(),
  }).optional(),
  extractedKeywords: z.array(z.string()).optional(),
});

export type SeoAuditOutput = z.infer<typeof SeoAuditOutputSchema>;

// =============================================================================
// Constants
// =============================================================================

const CHECK_DESCRIPTIONS: Record<string, string> = {
  title: 'The page should have a title tag with an appropriate length (50-60 characters).',
  description: 'The page should have a meta description with an appropriate length (120-160 characters).',
  canonical: 'The page should have a valid canonical URL to prevent duplicate content issues.',
  h1: 'The page should have exactly one H1 tag that describes the main topic.',
  https: 'The page should be served over HTTPS for security and SEO benefits.',
  no_content_encoding: 'Content should be properly encoded (gzip/brotli) for faster loading.',
  is_http: 'The page is using HTTP instead of HTTPS, which can hurt SEO rankings.',
  has_redirect: 'The page has redirects that may slow down loading and dilute link equity.',
  no_doctype: 'The page is missing a DOCTYPE declaration.',
  flash: 'The page uses Flash which is not supported by modern browsers.',
  frame: 'The page uses frames which can cause SEO and accessibility issues.',
  lorem_ipsum: 'The page contains placeholder Lorem Ipsum text.',
  seo_friendly_url: 'URLs should be readable and contain relevant keywords.',
  title_too_long: 'The title tag is too long and may be truncated in search results.',
  title_too_short: 'The title tag is too short and may not be descriptive enough.',
  description_too_long: 'The meta description is too long and may be truncated.',
  description_too_short: 'The meta description is too short and may not provide enough context.',
  low_content_rate: 'The page has a low text-to-HTML ratio, which may indicate thin content.',
  high_loading_time: 'The page takes too long to load, which can hurt user experience and rankings.',
  is_broken: 'The page returns an error status code.',
  size_greater_than_3mb: 'The page size exceeds 3MB which can cause slow loading.',
  no_image_alt: 'Images are missing alt text, which hurts accessibility and image SEO.',
  no_h1_tag: 'The page is missing an H1 tag.',
  duplicate_title_tag: 'Multiple pages share the same title tag.',
  duplicate_meta_description: 'Multiple pages share the same meta description.',
  duplicate_content: 'The page has duplicate or near-duplicate content with other pages.',
};

// Positive checks where TRUE means GOOD
const POSITIVE_CHECKS = new Set(['is_https', 'has_html_doctype']);

// Informational checks - neutral data points
const INFORMATIONAL_CHECKS = new Set(['is_www', 'from_sitemap', 'has_micromarkup']);

// =============================================================================
// Helpers
// =============================================================================

function formatCheckTitle(checkId: string): string {
  return checkId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'Only HTTP/HTTPS URLs are allowed' };
    }

    // Block internal IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return { isValid: false, error: 'Internal URLs are not allowed' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Run on-page SEO audit using DataForSEO
 */
async function runOnPageAudit(
  apiToken: string,
  url: string
): Promise<DataForSEOOnPageResponse> {
  const requestBody = [{
    url,
    enable_javascript: false,
    load_resources: true,
    enable_browser_rendering: false,
    browser_preset: 'desktop',
    store_raw_html: false,
    disable_cookie_popup: true,
    check_spell: false,
  }];

  const response = await fetchWithRetry(
    `${DATAFORSEO_BASE_URL}/on_page/instant_pages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 60000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DataForSEO API error: ${response.status} - ${errorText}`);
  }

  const data: DataForSEOOnPageResponse = await response.json();

  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO API error: ${data.status_message}`);
  }

  return data;
}

// =============================================================================
// Node Definition
// =============================================================================

/**
 * SEO Audit Node
 *
 * Runs an SEO audit using DataForSEO On-Page Instant Pages API.
 * Provides comprehensive on-page SEO analysis including meta tags,
 * content analysis, technical SEO checks, and performance metrics.
 *
 * Requires `context.credentials.dataForSeo.apiToken` to be provided.
 *
 * @example
 * ```typescript
 * const result = await seoAuditNode.executor({
 *   url: 'https://example.com'
 * }, context);
 * ```
 */
export const seoAuditNode = defineNode({
  type: 'seo_audit',
  name: 'SEO Audit',
  description: 'Run comprehensive SEO audit using DataForSEO',
  category: 'integration',
  inputSchema: SeoAuditInputSchema,
  outputSchema: SeoAuditOutputSchema,
  estimatedDuration: 30,
  capabilities: {
    supportsRerun: true,
  },

  executor: async (input, context) => {
    try {
      // Check for API token
      const apiToken = context.credentials?.dataForSeo?.apiToken;
      if (!apiToken) {
        return {
          success: false,
          error: 'DataForSEO API token not configured. Please provide context.credentials.dataForSeo.apiToken.',
        };
      }

      // Check for stored values from previous approval
      const storedUrl = context.variables?.['site_url'] as string | undefined;
      const skipFlag = context.variables?.['seo_audit_skip'] as boolean | undefined;

      const urlToAudit = input.url || storedUrl;

      // Handle skip case
      if (skipFlag) {
        return {
          success: true,
          output: {
            skipped: true,
            overallScore: null,
            issues: [],
            passedAudits: 0,
            failedAudits: 0,
            url: null,
          },
        };
      }

      // If no URL provided, indicate awaiting input
      if (!urlToAudit) {
        return {
          success: true,
          output: {
            awaitingUrl: true,
            overallScore: null,
            issues: [],
            passedAudits: 0,
            failedAudits: 0,
            url: null,
          },
        };
      }

      // Validate URL
      const urlValidation = validateUrl(urlToAudit);
      if (!urlValidation.isValid) {
        return {
          success: false,
          error: `Invalid URL: ${urlValidation.error}`,
        };
      }

      // Call DataForSEO
      const auditResponse = await runOnPageAudit(apiToken, urlToAudit);
      const onPageResult = auditResponse.tasks?.[0]?.result?.[0]?.items?.[0];

      if (!onPageResult) {
        return {
          success: false,
          error: 'No audit results returned from DataForSEO',
        };
      }

      const overallScore = Math.round(onPageResult.onpage_score || 0);

      // Build issues from failed checks
      const issues: SeoIssue[] = [];
      let passedAudits = 0;
      let failedAudits = 0;

      if (onPageResult.checks) {
        for (const [checkId, checkData] of Object.entries(onPageResult.checks)) {
          if (INFORMATIONAL_CHECKS.has(checkId)) {
            continue;
          }

          let isPassed: boolean;

          if (POSITIVE_CHECKS.has(checkId)) {
            // Positive checks: passed=true means the good thing IS present (e.g. is_https)
            isPassed = checkData.passed;
          } else {
            // Normal checks: passed=true means the problem is ABSENT (i.e. the page is clean)
            // DataForSEO sets passed=true to mean "no issue found", so invert for our tracking
            isPassed = !checkData.passed;
          }

          if (isPassed) {
            passedAudits++;
          } else {
            failedAudits++;
            issues.push({
              id: checkId,
              title: formatCheckTitle(checkId),
              description: checkData.description || CHECK_DESCRIPTIONS[checkId] || `Issue: ${formatCheckTitle(checkId)}`,
              score: checkData.score,
            });
          }
        }
      }

      const output: SeoAuditOutput = {
        overallScore,
        issues,
        passedAudits,
        failedAudits,
        url: urlToAudit,
        meta: onPageResult.meta,
      };

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run SEO audit',
      };
    }
  },
});
