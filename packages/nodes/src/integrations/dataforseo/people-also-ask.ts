import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';

// Constants
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// Types

interface DataForSEOPaaItem {
    type: string;
    title?: string;
    seed_keyword?: string;
    items?: Array<{
        type: string;
        title?: string;
        featured_snippet?: {
            description?: string;
            url?: string;
        };
    }>;
}

interface DataForSEOPaaResponse {
    status_code: number;
    status_message: string;
    tasks?: Array<{
        result?: Array<{
            items?: DataForSEOPaaItem[];
        }>;
    }>;
}

// Schemas

export const DataforseoPeopleAlsoAskInputSchema = z.object({
    keyword: z.string().min(1, 'Keyword is required'),
    location: z.string().optional().default('United States'),
    language: z.string().optional().default('en'),
});

export type DataforseoPeopleAlsoAskInput = z.infer<typeof DataforseoPeopleAlsoAskInputSchema>;

export const DataforseoPeopleAlsoAskOutputSchema = z.object({
    keyword: z.string(),
    questions: z.array(z.object({
        question: z.string(),
        answer: z.string().optional(),
        sourceUrl: z.string().optional(),
    })),
    totalQuestions: z.number(),
});

export type DataforseoPeopleAlsoAskOutput = z.infer<typeof DataforseoPeopleAlsoAskOutputSchema>;

// Node Definition

/**
 * DataForSEO People Also Ask Node
 *
 * Gets "People Also Ask" questions for a keyword using DataForSEO SERP API.
 *
 * Requires `context.credentials.dataForSeo.apiToken` to be provided.
 */
export const dataforseoPeopleAlsoAskNode = defineNode({
    type: 'dataforseo_people_also_ask',
    name: 'DataForSEO People Also Ask',
    description: 'Get "People Also Ask" questions for a keyword using DataForSEO',
    category: 'integration',
    inputSchema: DataforseoPeopleAlsoAskInputSchema,
    outputSchema: DataforseoPeopleAlsoAskOutputSchema,
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
                language_code: input.language ?? 'en',
                device: 'desktop',
                os: 'windows',
                depth: 2,
            }];

            const response = await fetchWithRetry(
                `${DATAFORSEO_BASE_URL}/serp/google/people_also_ask/live/regular`,
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

            const data: DataForSEOPaaResponse = await response.json();

            if (data.status_code !== 20000) {
                throw new Error(`DataForSEO API error: ${data.status_message}`);
            }

            const items: DataForSEOPaaItem[] = data.tasks?.[0]?.result?.[0]?.items || [];

            // Filter to items where type === 'people_also_ask'
            const paaItems = items.filter(item => item.type === 'people_also_ask');

            const questions = paaItems.flatMap(item =>
                (item.items || [])
                    .filter(q => q.type === 'people_also_ask_element' && q.title)
                    .map(q => ({
                        question: q.title!,
                        answer: q.featured_snippet?.description,
                        sourceUrl: q.featured_snippet?.url,
                    }))
            );

            return {
                success: true,
                output: {
                    keyword: input.keyword,
                    questions,
                    totalQuestions: questions.length,
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
