import { defineNode } from '@jam-nodes/core'
import { fetchWithRetry } from '../../utils/http.js'
import {
  DevtoUpdateArticleInputSchema,
  DevtoUpdateArticleOutputSchema,
  type DevtoUpdateArticleInput,
  type DevtoApiArticle,
  normalizeDevtoArticle,
} from './schemas.js'

const DEVTO_API_BASE = 'https://dev.to/api'

export const devtoUpdateArticleNode = defineNode({
  type: 'devto_update_article',
  name: 'Dev.to Update Article',
  description: 'Update an existing article on Dev.to by its ID',
  category: 'integration',
  inputSchema: DevtoUpdateArticleInputSchema,
  outputSchema: DevtoUpdateArticleOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: DevtoUpdateArticleInput, context) => {
    try {
      const apiKey = context.credentials?.devto?.apiKey
      if (!apiKey) {
        return {
          success: false,
          error:
            'Dev.to API key not configured. Please provide context.credentials.devto.apiKey.',
        }
      }

      const articleBody: Record<string, unknown> = {}
      if (input.title !== undefined) articleBody['title'] = input.title
      if (input.bodyMarkdown !== undefined)
        articleBody['body_markdown'] = input.bodyMarkdown
      if (input.published !== undefined)
        articleBody['published'] = input.published
      if (input.tags !== undefined) articleBody['tags'] = input.tags
      if (input.description !== undefined)
        articleBody['description'] = input.description

      const response = await fetchWithRetry(
        `${DEVTO_API_BASE}/articles/${input.id}`,
        {
          method: 'PUT',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ article: articleBody }),
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 },
      )

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Dev.to API error ${response.status}: ${errorText}`,
        }
      }

      const data = (await response.json()) as DevtoApiArticle

      return {
        success: true,
        output: normalizeDevtoArticle(data),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})
