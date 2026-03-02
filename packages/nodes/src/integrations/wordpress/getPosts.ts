import { defineNode } from '@jam-nodes/core'
import { fetchWithRetry } from '../../utils/http.js'
import {
  WordPressGetPostsInputSchema,
  WordPressGetPostsOutputSchema,
  type WordPressGetPostsInput,
  type WordPressApiPost,
  normalizeWordPressPost,
} from './schemas.js'

const DEFAULT_PER_PAGE = 10

export const wordpressGetPostsNode = defineNode({
  type: 'wordpress_get_posts',
  name: 'WordPress Get Posts',
  description: 'Retrieve posts from a WordPress site',
  category: 'integration',
  inputSchema: WordPressGetPostsInputSchema,
  outputSchema: WordPressGetPostsOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: WordPressGetPostsInput, context) => {
    try {
      const creds = context.credentials?.wordpress
      if (!creds?.siteUrl || !creds?.username || !creds?.applicationPassword) {
        return {
          success: false,
          error:
            'WordPress credentials not configured. Please provide context.credentials.wordpress with siteUrl, username, and applicationPassword.',
        }
      }

      const { siteUrl, username, applicationPassword } = creds
      const baseUrl = siteUrl.replace(/\/+$/, '')
      const authHeader = `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`

      const perPage = input.perPage ?? DEFAULT_PER_PAGE
      const page = input.page ?? 1

      const params = new URLSearchParams({
        per_page: String(perPage),
        page: String(page),
      })
      if (input.status !== undefined) params.set('status', input.status)
      if (input.search !== undefined) params.set('search', input.search)

      const response = await fetchWithRetry(
        `${baseUrl}/wp-json/wp/v2/posts?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: authHeader,
          },
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 },
      )

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `WordPress API error ${response.status}: ${errorText}`,
        }
      }

      const totalFound = parseInt(response.headers.get('X-WP-Total') ?? '0', 10)
      const data = (await response.json()) as WordPressApiPost[]
      const posts = data.map(normalizeWordPressPost)

      return {
        success: true,
        output: {
          posts,
          meta: {
            totalFound: isNaN(totalFound) ? 0 : totalFound,
            limit: perPage,
            offset: (page - 1) * perPage,
          },
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})
