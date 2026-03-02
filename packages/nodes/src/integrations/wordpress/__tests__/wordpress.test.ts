import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WordPressCredential,
  wordpressCreatePostNode,
  wordpressUpdatePostNode,
  wordpressGetPostsNode,
  wordpressUploadMediaNode,
  WordPressCreatePostInputSchema,
  WordPressUpdatePostInputSchema,
  WordPressGetPostsInputSchema,
  WordPressUploadMediaInputSchema,
  WordPressPostSchema,
  WordPressMediaSchema,
  normalizeWordPressPost,
} from '../index.js'

// ─── Mock fixtures ────────────────────────────────────────────────────────────

const mockRawPost = {
  id: 42,
  title: { rendered: 'Hello WordPress' },
  slug: 'hello-wordpress',
  status: 'publish',
  link: 'https://example.com/hello-wordpress',
  date: '2024-01-15T12:00:00',
  modified: '2024-01-16T09:00:00',
  author: 1,
  featured_media: 7,
  categories: [2, 5],
  tags: [3],
  content: { rendered: '<p>Post content</p>' },
  excerpt: { rendered: '<p>Short excerpt</p>' },
}

const mockContext = {
  userId: 'u1',
  workflowExecutionId: 'w1',
  variables: {},
  resolveNestedPath: () => undefined,
  credentials: {
    wordpress: {
      siteUrl: 'https://example.com',
      username: 'admin',
      applicationPassword: 'abcd 1234 efgh 5678',
    },
  },
} as const

const mockContextSubpath = {
  ...mockContext,
  credentials: {
    wordpress: {
      siteUrl: 'https://example.com/blog/',
      username: 'admin',
      applicationPassword: 'pass',
    },
  },
}

const expectedBase64 = Buffer.from('admin:abcd 1234 efgh 5678').toString(
  'base64',
)
const expectedAuthHeader = `Basic ${expectedBase64}`

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── Credential ───────────────────────────────────────────────────────────────

describe('wordpress credential', () => {
  it('has correct metadata', () => {
    expect(WordPressCredential.name).toBe('wordpress')
    expect(WordPressCredential.type).toBe('basic')
  })

  it('schema requires siteUrl, username, applicationPassword', () => {
    const ok = WordPressCredential.schema.safeParse({
      siteUrl: 'https://example.com',
      username: 'admin',
      applicationPassword: 'secret',
    })
    expect(ok.success).toBe(true)
  })

  it('schema rejects missing fields', () => {
    const result = WordPressCredential.schema.safeParse({ username: 'admin' })
    expect(result.success).toBe(false)
  })

  it('schema rejects invalid siteUrl', () => {
    const result = WordPressCredential.schema.safeParse({
      siteUrl: 'not-a-url',
      username: 'admin',
      applicationPassword: 'secret',
    })
    expect(result.success).toBe(false)
  })
})

// ─── Schema validation ────────────────────────────────────────────────────────

describe('wordpress schemas', () => {
  it('WordPressCreatePostInputSchema accepts required fields only', () => {
    const result = WordPressCreatePostInputSchema.safeParse({
      title: 'My Post',
      content: '# Hello',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBeUndefined()
  })

  it('WordPressCreatePostInputSchema rejects missing content', () => {
    const result = WordPressCreatePostInputSchema.safeParse({
      title: 'My Post',
    })
    expect(result.success).toBe(false)
  })

  it('WordPressCreatePostInputSchema rejects empty title', () => {
    const result = WordPressCreatePostInputSchema.safeParse({
      title: '',
      content: 'Body',
    })
    expect(result.success).toBe(false)
  })

  it('WordPressCreatePostInputSchema accepts all optional fields', () => {
    const result = WordPressCreatePostInputSchema.safeParse({
      title: 'Post',
      content: 'Body',
      status: 'publish',
      categories: [1, 2],
      tags: [5],
      featuredMediaId: 10,
      excerpt: 'Short summary',
      slug: 'my-post',
    })
    expect(result.success).toBe(true)
  })

  it('WordPressUpdatePostInputSchema requires postId', () => {
    const result = WordPressUpdatePostInputSchema.safeParse({
      title: 'Updated',
    })
    expect(result.success).toBe(false)
  })

  it('WordPressUpdatePostInputSchema allows partial update with just postId', () => {
    const result = WordPressUpdatePostInputSchema.safeParse({ postId: 99 })
    expect(result.success).toBe(true)
  })

  it('WordPressGetPostsInputSchema accepts all optional', () => {
    const result = WordPressGetPostsInputSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('WordPressGetPostsInputSchema rejects perPage > 100', () => {
    const result = WordPressGetPostsInputSchema.safeParse({ perPage: 101 })
    expect(result.success).toBe(false)
  })

  it('WordPressGetPostsInputSchema rejects perPage < 1', () => {
    const result = WordPressGetPostsInputSchema.safeParse({ perPage: 0 })
    expect(result.success).toBe(false)
  })
})

// ─── normalizeWordPressPost ───────────────────────────────────────────────────

describe('normalizeWordPressPost', () => {
  it('flattens nested title.rendered to title', () => {
    const result = normalizeWordPressPost(mockRawPost)
    expect(result.title).toBe('Hello WordPress')
  })

  it('maps featured_media to featuredMedia', () => {
    const result = normalizeWordPressPost(mockRawPost)
    expect(result.featuredMedia).toBe(7)
  })

  it('includes all required fields', () => {
    const result = normalizeWordPressPost(mockRawPost)
    const parsed = WordPressPostSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('includes optional content and excerpt when present', () => {
    const result = normalizeWordPressPost(mockRawPost)
    expect(result.content).toBe('<p>Post content</p>')
    expect(result.excerpt).toBe('<p>Short excerpt</p>')
  })

  it('omits content and excerpt when absent', () => {
    const rawWithout = {
      ...mockRawPost,
      content: undefined,
      excerpt: undefined,
    }
    const result = normalizeWordPressPost(rawWithout)
    expect(result.content).toBeUndefined()
    expect(result.excerpt).toBeUndefined()
  })

  it('defaults categories and tags to empty array when absent', () => {
    const raw = {
      ...mockRawPost,
      categories: undefined as unknown as number[],
      tags: undefined as unknown as number[],
    }
    const result = normalizeWordPressPost(raw)
    expect(result.categories).toEqual([])
    expect(result.tags).toEqual([])
  })
})

// ─── wordpressCreatePost ──────────────────────────────────────────────────────

describe('wordpressCreatePostNode', () => {
  it('has correct type and category', () => {
    expect(wordpressCreatePostNode.type).toBe('wordpress_create_post')
    expect(wordpressCreatePostNode.category).toBe('integration')
  })

  it('returns failure when credentials are missing', async () => {
    const ctx = { ...mockContext, credentials: {} }
    const result = await wordpressCreatePostNode.executor(
      { title: 'Test', content: 'Body' },
      ctx,
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/siteUrl/)
    expect(result.error).toMatch(/username/)
    expect(result.error).toMatch(/applicationPassword/)
  })

  it('sends POST to correct endpoint with Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawPost),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressCreatePostNode.executor(
      { title: 'New Post', content: 'Body content' },
      mockContext,
    )

    expect(result.success).toBe(true)
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.com/wp-json/wp/v2/posts')
    expect(options.method).toBe('POST')
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      expectedAuthHeader,
    )
  })

  it('defaults status to draft when not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawPost),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressCreatePostNode.executor(
      { title: 'Draft Post', content: 'Content' },
      mockContext,
    )

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(options.body as string) as Record<string, unknown>
    expect(body['status']).toBe('draft')
  })

  it('maps featuredMediaId to featured_media in request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawPost),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressCreatePostNode.executor(
      {
        title: 'Post with media',
        content: 'Body',
        featuredMediaId: 99,
      },
      mockContext,
    )

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(options.body as string) as Record<string, unknown>
    expect(body['featured_media']).toBe(99)
    expect(body['featuredMediaId']).toBeUndefined()
  })

  it('strips trailing slash from siteUrl and handles subpath', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawPost),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressCreatePostNode.executor(
      { title: 'Post', content: 'Body' },
      mockContextSubpath,
    )

    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toBe('https://example.com/blog/wp-json/wp/v2/posts')
  })

  it('returns failure on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Unprocessable Entity'),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressCreatePostNode.executor(
      { title: 'Post', content: 'Body' },
      mockContext,
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch('422')
  })

  it('returns failure on 401 unauthorized', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressCreatePostNode.executor(
      { title: 'Post', content: 'Body' },
      mockContext,
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch('401')
  })

  it('returns normalized output matching WordPressPostSchema', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawPost),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressCreatePostNode.executor(
      { title: 'Post', content: 'Body', status: 'publish' },
      mockContext,
    )

    expect(result.success).toBe(true)
    if (result.success && result.output) {
      const parsed = WordPressPostSchema.safeParse(result.output)
      expect(parsed.success).toBe(true)
      expect((result.output as { id: number }).id).toBe(42)
    }
  })
})

// ─── wordpressUpdatePost ──────────────────────────────────────────────────────

describe('wordpressUpdatePostNode', () => {
  it('has correct type and category', () => {
    expect(wordpressUpdatePostNode.type).toBe('wordpress_update_post')
    expect(wordpressUpdatePostNode.category).toBe('integration')
  })

  it('returns failure when credentials are missing', async () => {
    const ctx = { ...mockContext, credentials: {} }
    const result = await wordpressUpdatePostNode.executor(
      { postId: 1, title: 'Updated' },
      ctx,
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/siteUrl/)
  })

  it('sends POST to correct URL with postId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawPost),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressUpdatePostNode.executor(
      { postId: 42, title: 'Updated Title' },
      mockContext,
    )

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.com/wp-json/wp/v2/posts/42')
    expect(options.method).toBe('POST')
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      expectedAuthHeader,
    )
  })

  it('only sends defined fields in body (partial update)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawPost),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressUpdatePostNode.executor(
      { postId: 42, status: 'publish' },
      mockContext,
    )

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(options.body as string) as Record<string, unknown>
    expect(body['status']).toBe('publish')
    expect(body['title']).toBeUndefined()
    expect(body['content']).toBeUndefined()
  })

  it('returns failure on 404 not found', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressUpdatePostNode.executor(
      { postId: 9999 },
      mockContext,
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch('404')
  })
})

// ─── wordpressGetPosts ────────────────────────────────────────────────────────

describe('wordpressGetPostsNode', () => {
  it('has correct type and category', () => {
    expect(wordpressGetPostsNode.type).toBe('wordpress_get_posts')
    expect(wordpressGetPostsNode.category).toBe('integration')
  })

  it('returns failure when credentials are missing', async () => {
    const ctx = { ...mockContext, credentials: {} }
    const result = await wordpressGetPostsNode.executor({}, ctx)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/applicationPassword/)
  })

  it('sends GET to correct endpoint with Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => '100' },
      json: () => Promise.resolve([mockRawPost]),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressGetPostsNode.executor({}, mockContext)

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('https://example.com/wp-json/wp/v2/posts')
    expect(options.method).toBe('GET')
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      expectedAuthHeader,
    )
  })

  it('reads X-WP-Total header for totalFound', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h === 'X-WP-Total' ? '57' : null) },
      json: () => Promise.resolve([mockRawPost]),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressGetPostsNode.executor({}, mockContext)

    expect(result.success).toBe(true)
    if (result.success && result.output) {
      const out = result.output as { meta: { totalFound: number } }
      expect(out.meta.totalFound).toBe(57)
    }
  })

  it('defaults totalFound to 0 when X-WP-Total header is absent', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: () => Promise.resolve([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressGetPostsNode.executor({}, mockContext)
    expect(result.success).toBe(true)
    if (result.success && result.output) {
      const out = result.output as { meta: { totalFound: number } }
      expect(out.meta.totalFound).toBe(0)
    }
  })

  it('computes offset as (page-1) * limit', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => '200' },
      json: () => Promise.resolve([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressGetPostsNode.executor(
      { page: 3, perPage: 20 },
      mockContext,
    )
    expect(result.success).toBe(true)
    if (result.success && result.output) {
      const out = result.output as {
        meta: { offset: number; limit: number }
      }
      expect(out.meta.offset).toBe(40) // (3-1)*20
      expect(out.meta.limit).toBe(20)
    }
  })

  it('passes status and search as query params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => '5' },
      json: () => Promise.resolve([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressGetPostsNode.executor(
      { status: 'draft', search: 'hello' },
      mockContext,
    )

    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toContain('status=draft')
    expect(url).toContain('search=hello')
  })

  it('maps per_page query param from perPage input', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => '0' },
      json: () => Promise.resolve([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressGetPostsNode.executor({ perPage: 50 }, mockContext)

    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toContain('per_page=50')
    expect(url).not.toContain('perPage=')
  })

  it('strips trailing slash from siteUrl with subpath', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => '0' },
      json: () => Promise.resolve([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressGetPostsNode.executor({}, mockContextSubpath)

    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toContain('https://example.com/blog/wp-json/wp/v2/posts')
    expect(url).not.toContain('/blog//wp-json')
  })

  it('returns failure on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressGetPostsNode.executor({}, mockContext)
    expect(result.success).toBe(false)
    expect(result.error).toMatch('500')
  })
})

// ─── wordpressUploadMedia ─────────────────────────────────────────────────────

const mockRawMedia = {
  id: 99,
  title: { rendered: 'test-image' },
  slug: 'test-image',
  status: 'inherit',
  link: 'https://example.com/?attachment_id=99',
  source_url: 'https://example.com/wp-content/uploads/test-image.jpg',
  media_type: 'image',
  mime_type: 'image/jpeg',
}

describe('WordPressUploadMediaInputSchema', () => {
  it('accepts valid input', () => {
    const result = WordPressUploadMediaInputSchema.safeParse({
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      contentBase64: Buffer.from('fake-image-data').toString('base64'),
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing filename', () => {
    const result = WordPressUploadMediaInputSchema.safeParse({
      mimeType: 'image/jpeg',
      contentBase64: 'abc123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty contentBase64', () => {
    const result = WordPressUploadMediaInputSchema.safeParse({
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      contentBase64: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('wordpressUploadMediaNode', () => {
  it('has correct type and category', () => {
    expect(wordpressUploadMediaNode.type).toBe('wordpress_upload_media')
    expect(wordpressUploadMediaNode.category).toBe('integration')
  })

  it('returns failure when credentials are missing', async () => {
    const ctx = { ...mockContext, credentials: {} }
    const result = await wordpressUploadMediaNode.executor(
      {
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        contentBase64: 'abc123',
      },
      ctx,
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/siteUrl/)
    expect(result.error).toMatch(/applicationPassword/)
  })

  it('sends POST to correct media endpoint with Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawMedia),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressUploadMediaNode.executor(
      {
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
        contentBase64: Buffer.from('fake').toString('base64'),
      },
      mockContext,
    )

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.com/wp-json/wp/v2/media')
    expect(options.method).toBe('POST')
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      expectedAuthHeader,
    )
  })

  it('sets Content-Disposition header with filename', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawMedia),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressUploadMediaNode.executor(
      {
        filename: 'my-photo.jpg',
        mimeType: 'image/jpeg',
        contentBase64: Buffer.from('fake').toString('base64'),
      },
      mockContext,
    )

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(
      (options.headers as Record<string, string>)['Content-Disposition'],
    ).toContain('my-photo.jpg')
  })

  it('returns normalized media output matching WordPressMediaSchema', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawMedia),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressUploadMediaNode.executor(
      {
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
        contentBase64: Buffer.from('fake').toString('base64'),
      },
      mockContext,
    )

    expect(result.success).toBe(true)
    if (result.success && result.output) {
      const parsed = WordPressMediaSchema.safeParse(result.output)
      expect(parsed.success).toBe(true)
      const out = result.output as {
        id: number
        sourceUrl: string
        mediaType: string
      }
      expect(out.id).toBe(99)
      expect(out.sourceUrl).toBe(
        'https://example.com/wp-content/uploads/test-image.jpg',
      )
      expect(out.mediaType).toBe('image')
    }
  })

  it('strips trailing slash from siteUrl', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRawMedia),
    })
    vi.stubGlobal('fetch', mockFetch)

    await wordpressUploadMediaNode.executor(
      {
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        contentBase64: Buffer.from('fake').toString('base64'),
      },
      mockContextSubpath,
    )

    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toBe('https://example.com/blog/wp-json/wp/v2/media')
  })

  it('returns failure on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      text: () => Promise.resolve('Payload Too Large'),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await wordpressUploadMediaNode.executor(
      {
        filename: 'huge.jpg',
        mimeType: 'image/jpeg',
        contentBase64: Buffer.from('fake').toString('base64'),
      },
      mockContext,
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch('413')
  })
})
