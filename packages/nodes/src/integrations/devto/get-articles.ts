import { defineNode } from '@jam-nodes/core'
import { fetchWithRetry } from '../../utils/http.js'
import {
  DevtoGetArticlesInputSchema,
  DevtoGetArticlesOutputSchema,
  type DevtoGetArticlesInput,
  type DevtoApiArticle,
  normalizeDevtoArticle,
} from './schemas.js'

const DEVTO_API_BASE = 'https://dev.to/api'

export const devtoGetArticlesNode = defineNode({
  type: 'devto_get_articles',
  name: 'Dev.to Get Articles',
  description:
    "Retrieve articles from Dev.to. If username is omitted, returns the authenticated user's articles.",
  category: 'integration',
  inputSchema: DevtoGetArticlesInputSchema,
  outputSchema: DevtoGetArticlesOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: DevtoGetArticlesInput, context) => {
    try {
      const apiKey = context.credentials?.devto?.apiKey
      if (!apiKey) {
        return {
          success: false,
          error:
            'Dev.to API key not configured. Please provide context.credentials.devto.apiKey.',
        }
      }

      const page = input.page ?? 1
      const perPage = input.perPage ?? 30

      let url: string
      if (input.username) {
        // List articles for a public username
        const params = new URLSearchParams({
          username: input.username,
          page: String(page),
          per_page: String(perPage),
        })
        url = `${DEVTO_API_BASE}/articles?${params.toString()}`
      } else {
        // List authenticated user's own articles
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(perPage),
        })
        url = `${DEVTO_API_BASE}/articles/me?${params.toString()}`
      }

      const response = await fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: {
            'api-key': apiKey,
          },
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

      const data = (await response.json()) as DevtoApiArticle[]
      const articles = data.map(normalizeDevtoArticle)

      return {
        success: true,
        output: {
          articles,
          page,
          perPage,
          count: articles.length,
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
