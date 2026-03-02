import { defineNode } from '@jam-nodes/core'
import { fetchWithRetry } from '../../utils/http.js'
import { resolveWordPressAuth } from './utils.js'
import {
  WordPressUpdatePostInputSchema,
  WordPressUpdatePostOutputSchema,
  type WordPressUpdatePostInput,
  type WordPressApiPost,
  normalizeWordPressPost,
} from './schemas.js'

export const wordpressUpdatePostNode = defineNode({
  type: 'wordpressUpdatePost',
  name: 'WordPress Update Post',
  description: 'Update an existing post on WordPress by its ID',
  category: 'integration',
  inputSchema: WordPressUpdatePostInputSchema,
  outputSchema: WordPressUpdatePostOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: WordPressUpdatePostInput, context) => {
    try {
      const authResult = resolveWordPressAuth(context.credentials?.wordpress)
      if ('error' in authResult) {
        return { success: false, error: authResult.error }
      }
      const { baseUrl, authHeader } = authResult

      const postBody: Record<string, unknown> = {}
      if (input.title !== undefined) postBody['title'] = input.title
      if (input.content !== undefined) postBody['content'] = input.content
      if (input.status !== undefined) postBody['status'] = input.status

      const response = await fetchWithRetry(
        `${baseUrl}/wp-json/wp/v2/posts/${input.postId}`,
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
