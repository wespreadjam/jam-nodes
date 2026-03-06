import { vi, describe, it, expect, beforeEach } from 'vitest'
import { dataforseoGetBacklinksNode, DataforseoGetBacklinksInputSchema } from '../backlinks.js'
import { dataforseoPeopleAlsoAskNode, DataforseoPeopleAlsoAskInputSchema } from '../people-also-ask.js'
import { dataforseoSerpNode, DataforseoSerpInputSchema } from '../serp.js'

const mockFetch = vi.fn()
vi.mock('../../../utils/http.js', () => ({
    fetchWithRetry: (...args: unknown[]) => mockFetch(...args),
}))

function makeContext(apiToken = 'dGVzdDp0ZXN0') {
    return {
        userId: 'test-user',
        workflowExecutionId: 'test-run',
        variables: {},
        resolveNestedPath: () => undefined,
        credentials: { dataForSeo: { apiToken } },
    }
}

function mockApiSuccess(items: unknown[], extra: Record<string, unknown> = {}) {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            status_code: 20000,
            status_message: 'Ok',
            tasks: [{ result: [{ items, ...extra }] }],
        }),
    })
}

function mockApiError(status = 400, text = 'Bad Request') {
    mockFetch.mockResolvedValueOnce({
        ok: false,
        status,
        text: async () => text,
    })
}

beforeEach(() => {
    mockFetch.mockReset()
})

// =============================================================================
// dataforseoGetBacklinksNode
// =============================================================================

describe('dataforseoGetBacklinksNode', () => {
    it('should have type dataforseo_get_backlinks', () => {
        expect(dataforseoGetBacklinksNode.type).toBe('dataforseo_get_backlinks')
    })

    it('should have category integration', () => {
        expect(dataforseoGetBacklinksNode.category).toBe('integration')
    })

    it('input schema: should accept valid input', () => {
        const result = DataforseoGetBacklinksInputSchema.safeParse({ target: 'example.com', limit: 50 })
        expect(result.success).toBe(true)
    })

    it('input schema: should reject empty target', () => {
        const result = DataforseoGetBacklinksInputSchema.safeParse({ target: '' })
        expect(result.success).toBe(false)
    })

    it('input schema: should reject limit above 1000', () => {
        const result = DataforseoGetBacklinksInputSchema.safeParse({ target: 'example.com', limit: 1001 })
        expect(result.success).toBe(false)
    })

    it('executor: should return success false when apiToken is missing', async () => {
        const ctx = {
            userId: 'test-user',
            workflowExecutionId: 'test-run',
            variables: {},
            resolveNestedPath: () => undefined,
            credentials: {},
        }
        const result = await dataforseoGetBacklinksNode.executor(
            { target: 'example.com', limit: 100 },
            ctx as never
        )
        expect(result.success).toBe(false)
        expect((result as { success: false; error: string }).error).toContain('API token not configured')
    })

    it('executor: should return backlinks on success', async () => {
        mockApiSuccess([
            { url_from: 'https://a.com/page', url_to: 'https://example.com', domain_from: 'a.com', dofollow: true, anchor: 'click here' },
            { url_from: 'https://b.com/post', url_to: 'https://example.com/about', domain_from: 'b.com', dofollow: false, anchor: null },
        ])
        const result = await dataforseoGetBacklinksNode.executor(
            { target: 'example.com', limit: 100 },
            makeContext() as never
        )
        expect(result.success).toBe(true)
        const output = (result as { success: true; output: { backlinks: unknown[]; target: string } }).output
        expect(output.backlinks.length).toBe(2)
        expect(output.target).toBe('example.com')
    })

    it('executor: should return success false on API HTTP error', async () => {
        mockApiError(429, 'Rate limit exceeded')
        const result = await dataforseoGetBacklinksNode.executor(
            { target: 'example.com', limit: 100 },
            makeContext() as never
        )
        expect(result.success).toBe(false)
        expect((result as { success: false; error: string }).error).toContain('429')
    })

    it('executor: should return success false when DataForSEO status_code is not 20000', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status_code: 40400, status_message: 'Task not found' }),
        })
        const result = await dataforseoGetBacklinksNode.executor(
            { target: 'example.com', limit: 100 },
            makeContext() as never
        )
        expect(result.success).toBe(false)
        expect((result as { success: false; error: string }).error).toContain('Task not found')
    })

    it('executor: should include totalCount from API response', async () => {
        mockApiSuccess(
            [{ url_from: 'https://a.com', url_to: 'https://example.com', domain_from: 'a.com', dofollow: true, anchor: null }],
            { total_count: 500 }
        )
        const result = await dataforseoGetBacklinksNode.executor(
            { target: 'example.com', limit: 100 },
            makeContext() as never
        )
        expect(result.success).toBe(true)
        const output = (result as { success: true; output: { totalCount: number } }).output
        expect(output.totalCount).toBe(500)
    })
})

// =============================================================================
// dataforseoPeopleAlsoAskNode
// =============================================================================

describe('dataforseoPeopleAlsoAskNode', () => {
    it('should have type dataforseo_people_also_ask', () => {
        expect(dataforseoPeopleAlsoAskNode.type).toBe('dataforseo_people_also_ask')
    })

    it('input schema: should accept valid minimal input', () => {
        const result = DataforseoPeopleAlsoAskInputSchema.safeParse({ keyword: 'typescript tutorial' })
        expect(result.success).toBe(true)
    })

    it('input schema: should reject empty keyword', () => {
        const result = DataforseoPeopleAlsoAskInputSchema.safeParse({ keyword: '' })
        expect(result.success).toBe(false)
    })

    it('executor: should return success false when apiToken is missing', async () => {
        const ctx = {
            userId: 'test-user',
            workflowExecutionId: 'test-run',
            variables: {},
            resolveNestedPath: () => undefined,
            credentials: {},
        }
        const result = await dataforseoPeopleAlsoAskNode.executor(
            { keyword: 'typescript tutorial', location: 'United States', language: 'en' },
            ctx as never
        )
        expect(result.success).toBe(false)
        expect((result as { success: false; error: string }).error).toContain('API token not configured')
    })

    it('executor: should return questions on success', async () => {
        const paaItems = [
            {
                type: 'people_also_ask',
                items: [
                    { type: 'people_also_ask_element', title: 'What is TypeScript?', featured_snippet: { description: 'A typed superset', url: 'https://typescriptlang.org' } },
                    { type: 'people_also_ask_element', title: 'How to install TypeScript?', featured_snippet: { description: 'npm install -g typescript', url: 'https://typescriptlang.org/download' } },
                ],
            },
            {
                type: 'people_also_ask',
                items: [
                    { type: 'people_also_ask_element', title: 'Is TypeScript free?', featured_snippet: { description: 'Yes, it is open source', url: 'https://github.com/microsoft/TypeScript' } },
                    { type: 'people_also_ask_element', title: 'What is tsc?', featured_snippet: { description: 'TypeScript compiler', url: 'https://typescriptlang.org/docs' } },
                ],
            },
        ]
        mockApiSuccess(paaItems)
        const result = await dataforseoPeopleAlsoAskNode.executor(
            { keyword: 'typescript tutorial', location: 'United States', language: 'en' },
            makeContext() as never
        )
        expect(result.success).toBe(true)
        const output = (result as { success: true; output: { questions: unknown[]; keyword: string } }).output
        expect(output.questions.length).toBe(4)
        expect(output.keyword).toBe('typescript tutorial')
    })

    it('executor: should return success false on API error', async () => {
        mockApiError(500, 'Internal Server Error')
        const result = await dataforseoPeopleAlsoAskNode.executor(
            { keyword: 'typescript tutorial', location: 'United States', language: 'en' },
            makeContext() as never
        )
        expect(result.success).toBe(false)
    })

    it('executor: should handle empty PAA results gracefully', async () => {
        mockApiSuccess([])
        const result = await dataforseoPeopleAlsoAskNode.executor(
            { keyword: 'typescript tutorial', location: 'United States', language: 'en' },
            makeContext() as never
        )
        expect(result.success).toBe(true)
        const output = (result as { success: true; output: { questions: unknown[]; totalQuestions: number } }).output
        expect(output.questions).toEqual([])
        expect(output.totalQuestions).toBe(0)
    })
})

// =============================================================================
// dataforseoSerpNode
// =============================================================================

describe('dataforseoSerpNode', () => {
    it('should have type dataforseo_serp', () => {
        expect(dataforseoSerpNode.type).toBe('dataforseo_serp')
    })

    it('input schema: should accept valid minimal input', () => {
        const result = DataforseoSerpInputSchema.safeParse({ keyword: 'best SEO tools' })
        expect(result.success).toBe(true)
    })

    it('input schema: should accept device desktop and mobile', () => {
        const desktop = DataforseoSerpInputSchema.safeParse({ keyword: 'seo', device: 'desktop' })
        const mobile = DataforseoSerpInputSchema.safeParse({ keyword: 'seo', device: 'mobile' })
        expect(desktop.success).toBe(true)
        expect(mobile.success).toBe(true)
    })

    it('input schema: should reject depth below 10', () => {
        const result = DataforseoSerpInputSchema.safeParse({ keyword: 'seo', depth: 5 })
        expect(result.success).toBe(false)
    })

    it('input schema: should reject depth above 100', () => {
        const result = DataforseoSerpInputSchema.safeParse({ keyword: 'seo', depth: 101 })
        expect(result.success).toBe(false)
    })

    it('executor: should return success false when apiToken is missing', async () => {
        const ctx = {
            userId: 'test-user',
            workflowExecutionId: 'test-run',
            variables: {},
            resolveNestedPath: () => undefined,
            credentials: {},
        }
        const result = await dataforseoSerpNode.executor(
            { keyword: 'best SEO tools', location: 'United States', device: 'desktop', depth: 10 },
            ctx as never
        )
        expect(result.success).toBe(false)
        expect((result as { success: false; error: string }).error).toContain('API token not configured')
    })

    it('executor: should return SERP results on success', async () => {
        mockApiSuccess([
            { type: 'organic', rank_group: 1, rank_absolute: 1, title: 'Result 1', url: 'https://site1.com', domain: 'site1.com' },
            { type: 'organic', rank_group: 2, rank_absolute: 2, title: 'Result 2', url: 'https://site2.com', domain: 'site2.com' },
            { type: 'organic', rank_group: 3, rank_absolute: 3, title: 'Result 3', url: 'https://site3.com', domain: 'site3.com' },
        ])
        const result = await dataforseoSerpNode.executor(
            { keyword: 'best SEO tools', location: 'United States', device: 'desktop', depth: 10 },
            makeContext() as never
        )
        expect(result.success).toBe(true)
        const output = (result as { success: true; output: { results: Array<{ position: number; title: string; url: string }> } }).output
        expect(output.results.length).toBe(3)
        for (const r of output.results) {
            expect(r).toHaveProperty('position')
            expect(r).toHaveProperty('title')
            expect(r).toHaveProperty('url')
        }
    })

    it('executor: should filter out non-organic items', async () => {
        mockApiSuccess([
            { type: 'organic', rank_group: 1, rank_absolute: 1, title: 'Organic Result', url: 'https://organic.com', domain: 'organic.com' },
            { type: 'people_also_ask', rank_group: 2, rank_absolute: 2, title: 'PAA Box', url: 'https://other.com' },
            { type: 'featured_snippet', rank_group: 0, rank_absolute: 0, title: 'Featured', url: 'https://featured.com' },
        ])
        const result = await dataforseoSerpNode.executor(
            { keyword: 'best SEO tools', location: 'United States', device: 'desktop', depth: 10 },
            makeContext() as never
        )
        expect(result.success).toBe(true)
        const output = (result as { success: true; output: { results: unknown[] } }).output
        expect(output.results.length).toBe(1)
    })

    it('executor: should return correct device in output', async () => {
        mockApiSuccess([])
        const result = await dataforseoSerpNode.executor(
            { keyword: 'best SEO tools', location: 'United States', device: 'mobile', depth: 10 },
            makeContext() as never
        )
        expect(result.success).toBe(true)
        const output = (result as { success: true; output: { device: string } }).output
        expect(output.device).toBe('mobile')
    })

    it('executor: should return success false on API error', async () => {
        mockApiError(503, 'Service Unavailable')
        const result = await dataforseoSerpNode.executor(
            { keyword: 'best SEO tools', location: 'United States', device: 'desktop', depth: 10 },
            makeContext() as never
        )
        expect(result.success).toBe(false)
    })
})
