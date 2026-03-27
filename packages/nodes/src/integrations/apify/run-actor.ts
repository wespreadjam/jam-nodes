import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry, sleep } from '../../utils/http.js';
import {
    ApifyRunActorInputSchema,
    ApifyRunActorOutputSchema,
    type ApifyRunActorInput,
    type ApifyRunActorOutput,
} from './schemas.js';

const APIFY_API_BASE = 'https://api.apify.com/v2';
const POLL_INTERVAL_MS = 2000;

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']);

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
// Apify API Functions
// =============================================================================

async function startActorRun(
    apiToken: string,
    actorId: string,
    input?: Record<string, unknown>
): Promise<ApifyRunResponse> {
    const response = await fetchWithRetry(
        `${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/runs`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify(input ?? {}),
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apify run actor error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<ApifyRunResponse>;
}

async function getRunDetails(
    apiToken: string,
    runId: string
): Promise<ApifyRunResponse> {
    const response = await fetchWithRetry(
        `${APIFY_API_BASE}/actor-runs/${runId}`,
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
        throw new Error(`Apify get run error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<ApifyRunResponse>;
}

async function pollUntilFinished(
    apiToken: string,
    runId: string,
    timeoutMs: number
): Promise<ApifyRunResponse['data']> {
    const maxAttempts = Math.ceil(timeoutMs / POLL_INTERVAL_MS);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = await getRunDetails(apiToken, runId);

        if (TERMINAL_STATUSES.has(result.data.status)) {
            return result.data;
        }

        await sleep(POLL_INTERVAL_MS);
    }

    throw new Error(
        `Apify actor run timed out after ${timeoutMs / 1000}s (runId: ${runId})`
    );
}

// =============================================================================
// Node Definition
// =============================================================================

export {
    ApifyRunActorInputSchema,
    ApifyRunActorOutputSchema,
    type ApifyRunActorInput,
    type ApifyRunActorOutput,
} from './schemas.js';

/**
 * Apify Run Actor Node
 *
 * Starts an Apify actor run and optionally polls until it completes.
 * Supports all public actors in the Apify Store (e.g. 'apify/google-search-scraper').
 *
 * @example
 * ```typescript
 * const result = await apifyRunActorNode.executor({
 *   actorId: 'apify/google-search-scraper',
 *   input: { queries: ['nodejs'], maxPagesPerQuery: 1 },
 *   waitForFinish: true,
 *   timeout: 120,
 * }, context);
 * ```
 */
export const apifyRunActorNode = defineNode({
    type: 'apify_run_actor',
    name: 'Apify Run Actor',
    description: 'Run an Apify actor (pre-built scraper) and optionally wait for it to finish',
    category: 'integration',
    inputSchema: ApifyRunActorInputSchema,
    outputSchema: ApifyRunActorOutputSchema,
    estimatedDuration: 60,
    capabilities: {
        supportsRerun: true,
        supportsCancel: true,
    },

    executor: async (input: ApifyRunActorInput, context) => {
        try {
            const apiToken = context.credentials?.apify?.apiToken as string | undefined;
            if (!apiToken) {
                return {
                    success: false,
                    error:
                        'Apify API token not configured. Please provide context.credentials.apify.apiToken.',
                };
            }

            // Start the actor run
            const startResult = await startActorRun(apiToken, input.actorId, input.input);
            const run = startResult.data;

            // If not waiting, return immediately with RUNNING status
            if (!input.waitForFinish) {
                const output: ApifyRunActorOutput = {
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
            }

            // Poll until finished or timeout
            const finalRun = await pollUntilFinished(
                apiToken,
                run.id,
                input.timeout * 1000
            );

            const output: ApifyRunActorOutput = {
                runId: finalRun.id,
                actorId: finalRun.actId,
                status: finalRun.status,
                startedAt: finalRun.startedAt,
                finishedAt: finalRun.finishedAt,
                defaultDatasetId: finalRun.defaultDatasetId,
                defaultKeyValueStoreId: finalRun.defaultKeyValueStoreId,
                defaultRequestQueueId: finalRun.defaultRequestQueueId,
            };

            return { success: true, output };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to run Apify actor',
            };
        }
    },
});
