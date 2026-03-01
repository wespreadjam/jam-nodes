import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';

// Constants
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// Types

interface DataForSEOKeywordIdea {
  keyword: string;
  keyword_info?: {
    search_volume?: number;
    cpc?: number;
  };
  keyword_properties?: {
    keyword_difficulty?: number;
  };
  search_intent_info?: {
    main_intent?: string;
  };
}

interface DataForSEOResponse {
  status_code: number;
  status_message: string;
  tasks?: Array<{
    result?: Array<{
      items?: DataForSEOKeywordIdea[];
    }>;
  }>;
}

// Schemas

export const SeoKeywordResearchInputSchema = z.object({
  /** Seed keywords to research */
  seedKeywords: z.array(z.string()),
  /** Location code (default: 2840 = US) */
  locationCode: z.number().optional().default(2840),
  /** Language code (default: 'en') */
  languageCode: z.string().optional().default('en'),
  /** Maximum keywords to return per seed */
  limit: z.number().optional().default(30),
});

export type SeoKeywordResearchInput = z.infer<typeof SeoKeywordResearchInputSchema>;

export const SeoKeywordResearchOutputSchema = z.object({
  keywords: z.array(z.object({
    keyword: z.string(),
    searchVolume: z.number(),
    keywordDifficulty: z.number(),
    cpc: z.number(),
    searchIntent: z.enum(['informational', 'commercial', 'navigational', 'transactional']),
  })),
  totalResearched: z.number(),
});

export type SeoKeywordResearchOutput = z.infer<typeof SeoKeywordResearchOutputSchema>;

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get keyword ideas from DataForSEO
 */
async function getKeywordIdeas(
  apiToken: string,
  keywords: string[],
  options: {
    locationCode?: number;
    languageCode?: string;
    limit?: number;
  }
): Promise<DataForSEOKeywordIdea[]> {
  const requestBody = [{
    keywords,
    location_code: options.locationCode || 2840,
    language_code: options.languageCode || 'en',
    include_serp_info: false,
    include_clickstream_data: false,
    limit: options.limit || 30,
    offset: 0,
  }];

  const response = await fetchWithRetry(
    `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/keyword_ideas/live`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DataForSEO API error: ${response.status} - ${errorText}`);
  }

  const data: DataForSEOResponse = await response.json();

  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO API error: ${data.status_message}`);
  }

  return data.tasks?.[0]?.result?.[0]?.items || [];
}

/**
 * Normalize search intent to valid enum value
 */
function normalizeSearchIntent(intent: string | undefined): 'informational' | 'commercial' | 'navigational' | 'transactional' {
  const normalized = (intent || 'informational').toLowerCase();
  if (['informational', 'commercial', 'navigational', 'transactional'].includes(normalized)) {
    return normalized as 'informational' | 'commercial' | 'navigational' | 'transactional';
  }
  return 'informational';
}

// Node Definition

/**
 * SEO Keyword Research Node
 *
 * Takes seed keywords and enriches them with search volume, keyword difficulty,
 * CPC, and search intent data using DataForSEO API.
 *
 * Requires `context.credentials.dataForSeo.apiToken` to be provided.
 *
 * @example
 * ```typescript
 * const result = await seoKeywordResearchNode.executor({
 *   seedKeywords: ['typescript tutorial', 'nodejs best practices'],
 *   locationCode: 2840, // US
 *   limit: 20
 * }, context);
 * ```
 */
export const seoKeywordResearchNode = defineNode({
  type: 'seo_keyword_research',
  name: 'Keyword Research',
  description: 'Research keywords to get search volume, difficulty, and intent data',
  category: 'integration',
  inputSchema: SeoKeywordResearchInputSchema,
  outputSchema: SeoKeywordResearchOutputSchema,
  estimatedDuration: 10,
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

      const researchedKeywords: SeoKeywordResearchOutput['keywords'] = [];
      const processedKeywords = new Set<string>();

      // Research each seed keyword
      for (const seedKeyword of input.seedKeywords) {
        if (!seedKeyword.trim()) continue;

        try {
          const results = await getKeywordIdeas(apiToken, [seedKeyword], {
            locationCode: input.locationCode ?? 2840,
            languageCode: input.languageCode ?? 'en',
            limit: input.limit ?? 30,
          });

          for (const kw of results) {
            // Skip duplicates
            if (processedKeywords.has(kw.keyword.toLowerCase())) continue;
            processedKeywords.add(kw.keyword.toLowerCase());

            researchedKeywords.push({
              keyword: kw.keyword,
              searchVolume: kw.keyword_info?.search_volume || 0,
              keywordDifficulty: kw.keyword_properties?.keyword_difficulty || 0,
              cpc: kw.keyword_info?.cpc || 0,
              searchIntent: normalizeSearchIntent(kw.search_intent_info?.main_intent),
            });
          }
        } catch (kwError) {
          // Continue with other keywords on individual failures
          console.warn(`Error researching keyword "${seedKeyword}":`, kwError);
        }
      }

      // Sort by search volume descending
      researchedKeywords.sort((a, b) => b.searchVolume - a.searchVolume);

      return {
        success: true,
        output: {
          keywords: researchedKeywords,
          totalResearched: researchedKeywords.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to research keywords',
      };
    }
  },
});
