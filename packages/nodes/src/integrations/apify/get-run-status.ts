import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import {
    ApifyGetRunStatusInputSchema,
    ApifyGetRunStatusOutputSchema,
    type ApifyGetRunStatusInput,
    type ApifyGetRunStatusOutput,
} from './schemas.js';

const APIFY_API_BASE = 'https://api.apify.com/v2';

// =============================================================================
// Apify API Types
// =============================================================================

interface ApifyRunResponse {
    data: {
        id: string;
        actId: string;
        status: string;
        startedAt: string | null;
        finishedAt: string | null;
        defaultDatasetId: string;
        defaultKeyValueStoreId: string;
        defaultRequestQueueId: string;
    };
}

// =============================================================================
// Node Definition
// =============================================================================

export {
    ApifyGetRunStatusInputSchema,
    ApifyGetRunStatusOutputSchema,
    type ApifyGetRunStatusInput,
    type ApifyGetRunStatusOutput,
} from './schemas.js';

/**
 * Apify Get Run Status Node
 *
 * Fetches the current status of an Apify actor run by its run ID.
 * Useful for polling in external orchestration or checking async run results.
 *
 * @example
 * ```typescript
 * const result = await apifyGetRunStatusNode.executor({
 *   runId: 'abc123xyz',
 * }, context);
 * ```
 */
export const apifyGetRunStatusNode = defineNode({
    type: 'apify_get_run_status',
    name: 'Apify Get Run Status',
    description: 'Check the status of an Apify actor run',
    category: 'integration',
    inputSchema: ApifyGetRunStatusInputSchema,
    outputSchema: ApifyGetRunStatusOutputSchema,
    estimatedDuration: 3,
    capabilities: {
        supportsRerun: true,
    },

    executor: async (input: ApifyGetRunStatusInput, context) => {
        try {
            const apiToken = context.credentials?.apify?.apiToken as string | undefined;
            if (!apiToken) {
                return {
                    success: false,
                    error:
                        'Apify API token not configured. Please provide context.credentials.apify.apiToken.',
                };
            }

            const response = await fetchWithRetry(
                `${APIFY_API_BASE}/actor-runs/${input.runId}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                    },
                },
                { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
            );

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `Apify run status error: ${response.status} - ${errorText}`,
                };
            }

            const data = (await response.json()) as ApifyRunResponse;
            const run = data.data;

            const output: ApifyGetRunStatusOutput = {
                runId: run.id,
                actorId: run.actId,
                status: run.status,
                startedAt: run.startedAt,
                finishedAt: run.finishedAt,
                defaultDatasetId: run.defaultDatasetId,
                defaultKeyValueStoreId: run.defaultKeyValueStoreId,
                defaultRequestQueueId: run.defaultRequestQueueId,
            };

            return { success: true, output };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get Apify run status',
            };
        }
    },
});
