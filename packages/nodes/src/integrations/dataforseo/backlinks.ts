import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';

// Constants
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// Types

interface DataForSEOBacklinkItem {
    url_from: string;
    url_to: string;
    domain_from: string;
    dofollow: boolean;
    anchor: string | null;
    page_from_rank?: number;
    domain_from_rank?: number;
    first_seen?: string;
    last_seen?: string;
}

interface DataForSEOBacklinksResponse {
    status_code: number;
    status_message: string;
    tasks?: Array<{
        result?: Array<{
            items?: DataForSEOBacklinkItem[];
            total_count?: number;
        }>;
    }>;
}

// Schemas

export const DataforseoGetBacklinksInputSchema = z.object({
    target: z.string().min(1, 'Target domain or URL is required'),
    limit: z.number().int().min(1).max(1000).optional().default(100),
    filters: z.object({
        dofollow: z.boolean().optional(),
        anchorContains: z.string().optional(),
    }).optional(),
});

export type DataforseoGetBacklinksInput = z.infer<typeof DataforseoGetBacklinksInputSchema>;

export const DataforseoGetBacklinksOutputSchema = z.object({
    backlinks: z.array(z.object({
        urlFrom: z.string(),
        urlTo: z.string(),
        domainFrom: z.string(),
        dofollow: z.boolean(),
        anchor: z.string().nullable(),
        pageFromRank: z.number().optional(),
        domainFromRank: z.number().optional(),
        firstSeen: z.string().optional(),
        lastSeen: z.string().optional(),
    })),
    totalCount: z.number(),
    target: z.string(),
});

export type DataforseoGetBacklinksOutput = z.infer<typeof DataforseoGetBacklinksOutputSchema>;

// Node Definition

/**
 * DataForSEO Get Backlinks Node
 *
 * Retrieves backlinks for a domain or URL using DataForSEO API.
 *
 * Requires `context.credentials.dataForSeo.apiToken` to be provided.
 */
export const dataforseoGetBacklinksNode = defineNode({
    type: 'dataforseo_get_backlinks',
    name: 'DataForSEO Get Backlinks',
    description: 'Retrieve backlinks for a domain or URL using DataForSEO',
    category: 'integration',
    inputSchema: DataforseoGetBacklinksInputSchema,
    outputSchema: DataforseoGetBacklinksOutputSchema,
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

            // Build filters array
            const filters: Array<unknown> = [];

            if (input.filters?.dofollow !== undefined) {
                filters.push(['dofollow', '=', input.filters.dofollow]);
            }

            if (input.filters?.anchorContains) {
                if (filters.length > 0) {
                    filters.push('and');
                }
                filters.push(['anchor', 'like', `%${input.filters.anchorContains}%`]);
            }

            const requestBody = [{
                target: input.target,
                limit: input.limit ?? 100,
                ...(filters.length > 0 && { filters }),
            }];

            const response = await fetchWithRetry(
                `${DATAFORSEO_BASE_URL}/backlinks/backlinks/live`,
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

            const data: DataForSEOBacklinksResponse = await response.json();

            if (data.status_code !== 20000) {
                throw new Error(`DataForSEO API error: ${data.status_message}`);
            }

            const items: DataForSEOBacklinkItem[] = data.tasks?.[0]?.result?.[0]?.items || [];
            const totalCount: number = data.tasks?.[0]?.result?.[0]?.total_count ?? items.length;

            return {
                success: true,
                output: {
                    backlinks: items.map(item => ({
                        urlFrom: item.url_from,
                        urlTo: item.url_to,
                        domainFrom: item.domain_from,
                        dofollow: item.dofollow,
                        anchor: item.anchor ?? null,
                        pageFromRank: item.page_from_rank,
                        domainFromRank: item.domain_from_rank,
                        firstSeen: item.first_seen,
                        lastSeen: item.last_seen,
                    })),
                    totalCount,
                    target: input.target,
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
