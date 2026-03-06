import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';

// Constants
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// Types

interface DataForSEOSerpItem {
    type: string;
    rank_group: number;
    rank_absolute: number;
    title?: string;
    description?: string;
    url?: string;
    domain?: string;
    breadcrumb?: string;
}

interface DataForSEOSerpResponse {
    status_code: number;
    status_message: string;
    tasks?: Array<{
        result?: Array<{
            items?: DataForSEOSerpItem[];
            se_results_count?: number;
            keyword?: string;
        }>;
    }>;
}

// Schemas

export const DataforseoSerpInputSchema = z.object({
    keyword: z.string().min(1, 'Keyword is required'),
    location: z.string().optional().default('United States'),
    device: z.enum(['desktop', 'mobile']).optional().default('desktop'),
    depth: z.number().int().min(10).max(100).optional().default(10),
});

export type DataforseoSerpInput = z.infer<typeof DataforseoSerpInputSchema>;

export const DataforseoSerpOutputSchema = z.object({
    keyword: z.string(),
    results: z.array(z.object({
        position: z.number(),
        title: z.string(),
        description: z.string().optional(),
        url: z.string(),
        domain: z.string().optional(),
        breadcrumb: z.string().optional(),
    })),
    totalResults: z.number(),
    device: z.string(),
});

export type DataforseoSerpOutput = z.infer<typeof DataforseoSerpOutputSchema>;

// Node Definition

/**
 * DataForSEO SERP Node
 *
 * Gets Google search engine results page (SERP) for a keyword using DataForSEO.
 *
 * Requires `context.credentials.dataForSeo.apiToken` to be provided.
 */
export const dataforseoSerpNode = defineNode({
    type: 'dataforseo_serp',
    name: 'DataForSEO SERP',
    description: 'Get Google search engine results page (SERP) for a keyword using DataForSEO',
    category: 'integration',
    inputSchema: DataforseoSerpInputSchema,
    outputSchema: DataforseoSerpOutputSchema,
    estimatedDuration: 10,
    capabilities: { supportsRerun: true },

    executor: async (input, context) => {
        try {
            const apiToken = context.credentials?.dataForSeo?.apiToken;
            if (!apiToken) {
                return {
                    success: false,
                    error: 'DataForSEO API token not configured. Please provide context.credentials.dataForSeo.apiToken.',
                };
            }

            const requestBody = [{
                keyword: input.keyword,
                location_name: input.location ?? 'United States',
                language_code: 'en',
                device: input.device ?? 'desktop',
                os: input.device === 'mobile' ? 'android' : 'windows',
                depth: input.depth ?? 10,
            }];

            const response = await fetchWithRetry(
                `${DATAFORSEO_BASE_URL}/serp/google/organic/live/regular`,
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

            const data: DataForSEOSerpResponse = await response.json();

            if (data.status_code !== 20000) {
                throw new Error(`DataForSEO API error: ${data.status_message}`);
            }

            const items: DataForSEOSerpItem[] = data.tasks?.[0]?.result?.[0]?.items || [];
            const seResultsCount: number = data.tasks?.[0]?.result?.[0]?.se_results_count ?? 0;

            // Only organic results
            const organicItems = items.filter(item => item.type === 'organic');

            return {
                success: true,
                output: {
                    keyword: input.keyword,
                    results: organicItems.map(item => ({
                        position: item.rank_absolute,
                        title: item.title ?? '',
                        description: item.description,
                        url: item.url ?? '',
                        domain: item.domain,
                        breadcrumb: item.breadcrumb,
                    })),
                    totalResults: seResultsCount,
                    device: input.device ?? 'desktop',
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
});
