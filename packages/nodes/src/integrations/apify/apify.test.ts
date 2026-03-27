import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    apifyCredential,
    apifyRunActorNode,
    apifyGetDatasetNode,
    apifyGetRunStatusNode,
    ApifyRunActorInputSchema,
    ApifyGetDatasetInputSchema,
    ApifyGetRunStatusInputSchema,
} from './index.js';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

// =============================================================================
// Credential
// =============================================================================

describe('apify credential', () => {
    it('defines bearer credential metadata', () => {
        expect(apifyCredential.name).toBe('apify');
        expect(apifyCredential.type).toBe('bearer');
        expect(apifyCredential.authenticate.properties.Authorization).toBe(
            'Bearer {{apiToken}}'
        );
    });
});

// =============================================================================
// Schemas
// =============================================================================

describe('apify schemas', () => {
    it('parses valid run actor input', () => {
        const result = ApifyRunActorInputSchema.safeParse({
            actorId: 'apify/google-search-scraper',
            input: { queries: ['nodejs'] },
            waitForFinish: true,
            timeout: 120,
        });
        expect(result.success).toBe(true);
    });

    it('applies defaults to run actor input', () => {
        const result = ApifyRunActorInputSchema.safeParse({
            actorId: 'apify/google-search-scraper',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.waitForFinish).toBe(true);
            expect(result.data.timeout).toBe(300);
        }
    });

    it('rejects run actor input with empty actorId', () => {
        const result = ApifyRunActorInputSchema.safeParse({ actorId: '' });
        expect(result.success).toBe(false);
    });

    it('parses valid get dataset input with defaults', () => {
        const result = ApifyGetDatasetInputSchema.safeParse({ datasetId: 'ds123' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.format).toBe('json');
        }
    });

    it('rejects invalid dataset format', () => {
        const result = ApifyGetDatasetInputSchema.safeParse({
            datasetId: 'ds123',
            format: 'toml',
        });
        expect(result.success).toBe(false);
    });

    it('parses valid get run status input', () => {
        const result = ApifyGetRunStatusInputSchema.safeParse({ runId: 'run123' });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// apify_run_actor
// =============================================================================

const makeContext = (credentials?: Record<string, unknown>) => ({
    userId: 'u1',
    workflowExecutionId: 'w1',
    variables: {},
    resolveNestedPath: () => undefined,
    credentials,
});

const makeRun = (status: string) => ({
    data: {
        id: 'run1',
        actId: 'apify~google-search-scraper',
        status,
        startedAt: '2026-01-01T00:00:00.000Z',
        finishedAt: status === 'SUCCEEDED' ? '2026-01-01T00:01:00.000Z' : null,
        defaultDatasetId: 'ds1',
        defaultKeyValueStoreId: 'kvs1',
        defaultRequestQueueId: 'rq1',
    },
});

describe('apify_run_actor', () => {
    it('fails when api token is missing', async () => {
        const result = await apifyRunActorNode.executor(
            { actorId: 'apify/google-search-scraper', waitForFinish: false, timeout: 300 },
            makeContext()
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('apify.apiToken');
    });

    it('starts actor run without waiting when waitForFinish is false', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(makeRun('RUNNING')), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        const result = await apifyRunActorNode.executor(
            {
                actorId: 'apify/google-search-scraper',
                input: { queries: ['nodejs'] },
                waitForFinish: false,
                timeout: 300,
            },
            makeContext({ apify: { apiToken: 'test_token' } })
        );

        expect(result.success).toBe(true);
        expect(result.output?.status).toBe('RUNNING');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/acts/apify%2Fgoogle-search-scraper/runs');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test_token');
    });

    it('polls until SUCCEEDED when waitForFinish is true', async () => {
        vi.useFakeTimers();

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                // First call: start actor (returns RUNNING)
                new Response(JSON.stringify(makeRun('RUNNING')), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                // Second call: poll -> still RUNNING
                new Response(JSON.stringify(makeRun('RUNNING')), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                // Third call: poll -> SUCCEEDED
                new Response(JSON.stringify(makeRun('SUCCEEDED')), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        vi.stubGlobal('fetch', fetchMock);

        // Run executor and auto-advance timers so sleep() resolves immediately
        const executorPromise = apifyRunActorNode.executor(
            {
                actorId: 'apify/google-search-scraper',
                waitForFinish: true,
                timeout: 300,
            },
            makeContext({ apify: { apiToken: 'test_token' } })
        );

        // Advance through each poll interval
        await vi.runAllTimersAsync();

        const result = await executorPromise;

        vi.useRealTimers();

        expect(result.success).toBe(true);
        expect(result.output?.status).toBe('SUCCEEDED');
        // 1 start + 2 polls
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
});

// =============================================================================
// apify_get_dataset
// =============================================================================

describe('apify_get_dataset', () => {
    it('fails when api token is missing', async () => {
        const result = await apifyGetDatasetNode.executor(
            { datasetId: 'ds1', format: 'json' },
            makeContext()
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('apify.apiToken');
    });

    it('retrieves dataset items successfully', async () => {
        const mockItems = [{ url: 'https://example.com', title: 'Example' }];
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    items: mockItems,
                    count: 1,
                    total: 1,
                    offset: 0,
                    limit: null,
                    desc: false,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        );
        vi.stubGlobal('fetch', fetchMock);

        const result = await apifyGetDatasetNode.executor(
            { datasetId: 'ds1', format: 'json', limit: 10, offset: 0 },
            makeContext({ apify: { apiToken: 'test_token' } })
        );

        expect(result.success).toBe(true);
        expect(result.output?.items).toHaveLength(1);
        expect(result.output?.count).toBe(1);
        expect(result.output?.datasetId).toBe('ds1');
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toContain('/datasets/ds1/items');
        expect(url).toContain('limit=10');
        expect(url).toContain('offset=0');
    });
});

// =============================================================================
// apify_get_run_status
// =============================================================================

describe('apify_get_run_status', () => {
    it('fails when api token is missing', async () => {
        const result = await apifyGetRunStatusNode.executor(
            { runId: 'run1' },
            makeContext()
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('apify.apiToken');
    });

    it('returns run status successfully', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(makeRun('SUCCEEDED')), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        const result = await apifyGetRunStatusNode.executor(
            { runId: 'run1' },
            makeContext({ apify: { apiToken: 'test_token' } })
        );

        expect(result.success).toBe(true);
        expect(result.output?.runId).toBe('run1');
        expect(result.output?.status).toBe('SUCCEEDED');
        expect(result.output?.defaultDatasetId).toBe('ds1');
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toContain('/actor-runs/run1');
    });
});
