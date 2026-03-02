import { defineNode } from '@jam-nodes/core'
import { fetchWithRetry } from '../../utils/http.js'
import { resolveWordPressAuth } from './utils.js'
import {
  WordPressCreatePostInputSchema,
  WordPressCreatePostOutputSchema,
  type WordPressCreatePostInput,
  type WordPressApiPost,
  normalizeWordPressPost,
} from './schemas.js'

export const wordpressCreatePostNode = defineNode({
  type: 'wordpressCreatePost',
  name: 'WordPress Create Post',
  description: 'Create a new post on WordPress (defaults to draft)',
  category: 'integration',
  inputSchema: WordPressCreatePostInputSchema,
  outputSchema: WordPressCreatePostOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: WordPressCreatePostInput, context) => {
    try {
      const authResult = resolveWordPressAuth(context.credentials?.wordpress)
      if ('error' in authResult) {
        return { success: false, error: authResult.error }
      }
      const { baseUrl, authHeader } = authResult

      const postBody: Record<string, unknown> = {
        title: input.title,
        content: input.content,
        status: input.status ?? 'draft',
      }
      if (input.categories !== undefined)
        postBody['categories'] = input.categories
      if (input.tags !== undefined) postBody['tags'] = input.tags
      if (input.featuredMediaId !== undefined)
        postBody['featured_media'] = input.featuredMediaId
      if (input.excerpt !== undefined) postBody['excerpt'] = input.excerpt
      if (input.slug !== undefined) postBody['slug'] = input.slug

      const response = await fetchWithRetry(
        `${baseUrl}/wp-json/wp/v2/posts`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postBody),
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

      const data = (await response.json()) as WordPressApiPost

      return {
        success: true,
        output: normalizeWordPressPost(data),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})
