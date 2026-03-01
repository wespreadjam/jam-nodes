import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  devtoCredential,
  devtoCreateArticleNode,
  devtoUpdateArticleNode,
  devtoGetArticlesNode,
  DevtoCreateArticleInputSchema,
  DevtoUpdateArticleInputSchema,
  DevtoGetArticlesInputSchema,
  DevtoArticleSchema,
  normalizeDevtoArticle,
} from '../index.js'

const mockRawArticle = {
  id: 1,
  title: 'Hello World',
  slug: 'hello-world-abc123',
  url: 'https://dev.to/user/hello-world-abc123',
  published: true,
  published_at: '2024-01-01T00:00:00Z',
  tag_list: ['webdev', 'javascript'],
  description: 'A hello world post',
  reading_time_minutes: 2,
}

const mockContext = {
  userId: 'u1',
  workflowExecutionId: 'w1',
  variables: {},
  resolveNestedPath: () => undefined,
  credentials: { devto: { apiKey: 'test-api-key' } },
} as const

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── Credential ──────────────────────────────────────────────────────────────

describe('devto credential', () => {
  it('defines credential metadata', () => {
    expect(devtoCredential.name).toBe('devto')
    expect(devtoCredential.type).toBe('apiKey')
    expect(devtoCredential.authenticate.properties['api-key']).toBe(
      '{{apiKey}}',
    )
  })
})

// ─── Schema validation ────────────────────────────────────────────────────────

describe('devto schemas', () => {
  it('DevtoCreateArticleInputSchema accepts input without published (executor applies default)', () => {
    const result = DevtoCreateArticleInputSchema.safeParse({
      title: 'A Post',
      bodyMarkdown: '# Hello',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.published).toBeUndefined()
  })

  it('DevtoCreateArticleInputSchema rejects missing required fields', () => {
    const result = DevtoCreateArticleInputSchema.safeParse({ title: 'A Post' })
    expect(result.success).toBe(false)
  })

  it('DevtoUpdateArticleInputSchema requires id', () => {
    const result = DevtoUpdateArticleInputSchema.safeParse({ title: 'Updated' })
    expect(result.success).toBe(false)
  })

  it('DevtoUpdateArticleInputSchema allows partial updates', () => {
    const result = DevtoUpdateArticleInputSchema.safeParse({
      id: 42,
      title: 'Updated Title',
    })
    expect(result.success).toBe(true)
  })

  it('DevtoGetArticlesInputSchema username is optional', () => {
    const result = DevtoGetArticlesInputSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.username).toBeUndefined()
      expect(result.data.page).toBeUndefined()
      expect(result.data.perPage).toBeUndefined()
    }
  })

  it('DevtoArticleSchema validates normalized article', () => {
    const result = DevtoArticleSchema.safeParse({
      id: 1,
      title: 'Hello',
      slug: 'hello',
      url: 'https://dev.to/u/hello',
      published: true,
      publishedAt: null,
      tags: ['js'],
      description: null,
      readingTimeMinutes: 1,
    })
    expect(result.success).toBe(true)
  })
})

// ─── normalizeDevtoArticle ────────────────────────────────────────────────────

describe('normalizeDevtoArticle', () => {
  it('maps snake_case API fields to camelCase', () => {
    const result = normalizeDevtoArticle(mockRawArticle)
    expect(result.id).toBe(1)
    expect(result.title).toBe('Hello World')
    expect(result.publishedAt).toBe('2024-01-01T00:00:00Z')
    expect(result.readingTimeMinutes).toBe(2)
    expect(result.tags).toEqual(['webdev', 'javascript'])
  })

  it('handles comma-separated string tag_list', () => {
    const result = normalizeDevtoArticle({
      ...mockRawArticle,
      tag_list: 'webdev, javascript',
    })
    expect(result.tags).toEqual(['webdev', 'javascript'])
  })

  it('handles null published_at', () => {
    const result = normalizeDevtoArticle({
      ...mockRawArticle,
      published_at: null,
    })
    expect(result.publishedAt).toBeNull()
  })

  it('handles null description', () => {
    const result = normalizeDevtoArticle({
      ...mockRawArticle,
      description: null,
    })
    expect(result.description).toBeNull()
  })
})

// ─── devto_create_article ─────────────────────────────────────────────────────

describe('devto_create_article', () => {
  it('fails when API key is missing', async () => {
    const result = await devtoCreateArticleNode.executor(
      { title: 'Test', bodyMarkdown: '# Test', published: false },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
      },
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('devto.apiKey')
  })

  it('sends correct POST request and returns normalized article', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRawArticle), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await devtoCreateArticleNode.executor(
      {
        title: 'Hello World',
        bodyMarkdown: '# Hello',
        published: true,
        tags: ['webdev'],
      },
      mockContext,
    )

    expect(result.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/articles')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['api-key']).toBe(
      'test-api-key',
    )

    const body = JSON.parse(String(init.body))
    expect(body.article.title).toBe('Hello World')
    expect(body.article.body_markdown).toBe('# Hello')
    expect(body.article.published).toBe(true)
    expect(body.article.tags).toEqual(['webdev'])

    if (result.success) {
      expect(result.output?.id).toBe(1)
      expect(result.output?.title).toBe('Hello World')
      expect(result.output?.tags).toEqual(['webdev', 'javascript'])
    }
  })

  it('passes series and canonicalUrl to the API request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRawArticle), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await devtoCreateArticleNode.executor(
      {
        title: 'Series Post',
        bodyMarkdown: '# Part 1',
        series: 'My Tutorial Series',
        canonicalUrl: 'https://myblog.com/original-post',
      },
      mockContext,
    )

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.article.series).toBe('My Tutorial Series')
    expect(body.article.canonical_url).toBe('https://myblog.com/original-post')
  })

  it('defaults published to false', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...mockRawArticle,
          published: false,
          published_at: null,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await devtoCreateArticleNode.executor(
      { title: 'Draft', bodyMarkdown: '# Draft' },
      mockContext,
    )

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.article.published).toBe(false)
  })

  it('returns error on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('Unprocessable Entity', { status: 422 }),
        ),
    )

    const result = await devtoCreateArticleNode.executor(
      { title: 'Bad', bodyMarkdown: '# Bad' },
      mockContext,
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('422')
  })

  it('returns error on 401 unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })),
    )

    const result = await devtoCreateArticleNode.executor(
      { title: 'Test', bodyMarkdown: '# Test' },
      mockContext,
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('401')
  })
})

// ─── devto_update_article ─────────────────────────────────────────────────────

describe('devto_update_article', () => {
  it('fails when API key is missing', async () => {
    const result = await devtoUpdateArticleNode.executor(
      { id: 1, title: 'Updated' },
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
      },
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('devto.apiKey')
  })

  it('sends correct PUT request to articles/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ...mockRawArticle, title: 'Updated Title' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await devtoUpdateArticleNode.executor(
      { id: 1, title: 'Updated Title', bodyMarkdown: '# Updated' },
      mockContext,
    )

    expect(result.success).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/articles/1')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['api-key']).toBe(
      'test-api-key',
    )

    const body = JSON.parse(String(init.body))
    expect(body.article.title).toBe('Updated Title')
    expect(body.article.body_markdown).toBe('# Updated')

    if (result.success) {
      expect(result.output?.title).toBe('Updated Title')
    }
  })

  it('only sends defined fields in partial update', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRawArticle), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await devtoUpdateArticleNode.executor(
      { id: 1, published: true },
      mockContext,
    )

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.article).toEqual({ published: true })
  })

  it('returns error on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })),
    )

    const result = await devtoUpdateArticleNode.executor(
      { id: 999 },
      mockContext,
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('404')
  })
})

// ─── devto_get_articles ────────────────────────────────────────────────────────

describe('devto_get_articles', () => {
  it('fails when API key is missing', async () => {
    const result = await devtoGetArticlesNode.executor(
      {},
      {
        userId: 'u1',
        workflowExecutionId: 'w1',
        variables: {},
        resolveNestedPath: () => undefined,
      },
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('devto.apiKey')
  })

  it('calls /articles/me when username is not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([mockRawArticle]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await devtoGetArticlesNode.executor({}, mockContext)

    expect(result.success).toBe(true)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/articles/me')
    expect(url).toContain('page=1')
    expect(url).toContain('per_page=30')
  })

  it('calls /articles?username=... when username is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([mockRawArticle]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await devtoGetArticlesNode.executor(
      { username: 'johndoe' },
      mockContext,
    )

    expect(result.success).toBe(true)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/articles?')
    expect(url).toContain('username=johndoe')
    expect(url).not.toContain('/articles/me')
  })

  it('returns normalized articles with count, page, perPage', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([mockRawArticle, mockRawArticle]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await devtoGetArticlesNode.executor(
      { page: 2, perPage: 10 },
      mockContext,
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output?.count).toBe(2)
      expect(result.output?.page).toBe(2)
      expect(result.output?.perPage).toBe(10)
      expect(result.output?.articles).toHaveLength(2)
      expect(result.output?.articles[0]?.id).toBe(1)
    }
  })

  it('passes pagination query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await devtoGetArticlesNode.executor({ page: 3, perPage: 50 }, mockContext)

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('page=3')
    expect(url).toContain('per_page=50')
  })

  it('returns error on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })),
    )

    const result = await devtoGetArticlesNode.executor({}, mockContext)

    expect(result.success).toBe(false)
    expect(result.error).toContain('401')
  })
})
