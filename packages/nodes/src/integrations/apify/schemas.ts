import { z } from 'zod';

// =============================================================================
// Run Actor
// =============================================================================

export const ApifyRunActorInputSchema = z.object({
    /** The actor ID or name (e.g. 'apify/google-search-scraper') */
    actorId: z.string().min(1),
    /** Input object passed to the actor */
    input: z.record(z.unknown()).optional(),
    /** Whether to wait for the run to finish before returning */
    waitForFinish: z.boolean().default(true),
    /** Maximum seconds to wait when waitForFinish is true (default: 300) */
    timeout: z.number().int().positive().default(300),
});

export const ApifyRunActorOutputSchema = z.object({
    runId: z.string(),
    actorId: z.string(),
    status: z.string(),
    startedAt: z.string().nullable(),
    finishedAt: z.string().nullable(),
    defaultDatasetId: z.string(),
    defaultKeyValueStoreId: z.string(),
    defaultRequestQueueId: z.string(),
});

export type ApifyRunActorInput = z.infer<typeof ApifyRunActorInputSchema>;
export type ApifyRunActorOutput = z.infer<typeof ApifyRunActorOutputSchema>;

// =============================================================================
// Get Dataset
// =============================================================================

export const ApifyGetDatasetInputSchema = z.object({
    /** The dataset ID to retrieve items from */
    datasetId: z.string().min(1),
    /** Maximum number of items to return */
    limit: z.number().int().positive().optional(),
    /** Number of items to skip from the start */
    offset: z.number().int().min(0).optional(),
    /** Output format of the items */
    format: z.enum(['json', 'csv', 'xlsx', 'html', 'rss', 'xml', 'jsonl']).default('json'),
});

export const ApifyGetDatasetOutputSchema = z.object({
    items: z.array(z.record(z.unknown())),
    count: z.number(),
    total: z.number(),
    offset: z.number(),
    limit: z.number().nullable(),
    datasetId: z.string(),
});

export type ApifyGetDatasetInput = z.infer<typeof ApifyGetDatasetInputSchema>;
export type ApifyGetDatasetOutput = z.infer<typeof ApifyGetDatasetOutputSchema>;

// =============================================================================
// Get Run Status
// =============================================================================

export const ApifyGetRunStatusInputSchema = z.object({
    /** The actor run ID to check */
    runId: z.string().min(1),
});

export const ApifyGetRunStatusOutputSchema = z.object({
    runId: z.string(),
    actorId: z.string(),
    status: z.string(),
    startedAt: z.string().nullable(),
    finishedAt: z.string().nullable(),
    defaultDatasetId: z.string(),
    defaultKeyValueStoreId: z.string(),
    defaultRequestQueueId: z.string(),
});

export type ApifyGetRunStatusInput = z.infer<typeof ApifyGetRunStatusInputSchema>;
export type ApifyGetRunStatusOutput = z.infer<typeof ApifyGetRunStatusOutputSchema>;
