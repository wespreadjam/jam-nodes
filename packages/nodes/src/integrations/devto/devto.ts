import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';

// Constants

const DEVTO_BASE_URL = 'https://dev.to/api';

// Types

export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  social_image: string;
  published_at: string;
  created_at: string;
  url: string;
  body_markdown?: string;
  body_html?: string;
  tags: string[];
  reading_time_minutes: number;
  user: {
    name: string;
    username: string;
    profile_image: string;
  };
}

// Schemas

export const DevToInputSchema = z.discriminatedUnion('operation', [
  // Create Article
  z.object({
    operation: z.literal('createArticle'),
    article: z.object({
      title: z.string(),
      bodyMarkdown: z.string(),
      published: z.boolean().optional().default(false),
      tags: z.array(z.string()).optional(),
      series: z.string().optional(),
      canonicalUrl: z.string().url().optional(),
      description: z.string().optional(),
    }),
  }),
  // Update Article
  z.object({
    operation: z.literal('updateArticle'),
    articleId: z.number(),
    article: z.object({
      title: z.string().optional(),
      bodyMarkdown: z.string().optional(),
      published: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      series: z.string().optional(),
      canonicalUrl: z.string().url().optional(),
      description: z.string().optional(),
    }),
  }),
  // Get Articles
  z.object({
    operation: z.literal('getArticles'),
    username: z.string().optional(),
    perPage: z.number().min(1).max(1000).optional().default(30),
    page: z.number().min(1).optional().default(1),
  }),
]);

export type DevToInput = z.infer<typeof DevToInputSchema>;

export const DevToOutputSchema = z.object({
  article: z.custom<DevToArticle>().optional(),
  articles: z.array(z.custom<DevToArticle>()).optional(),
  success: z.boolean(),
});

export type DevToOutput = z.infer<typeof DevToOutputSchema>;

// Node Definition

/**
 * Dev.to Integration Node
 *
 * Perform operations on the Dev.to platform such as creating, updating
 * or retrieving articles.
 *
 * Requires `context.credentials.devto.apiKey` to be provided.
 *
 * @example
 * ```typescript
 * const result = await devtoNode.executor({
 *   operation: 'createArticle',
 *   article: {
 *     title: 'Hello World',
 *     bodyMarkdown: 'My first post',
 *     published: false
 *   }
 * }, context);
 * ```
 */
export const devtoNode = defineNode({
  type: 'devto',
  name: 'Dev.to',
  description: 'Publish and manage articles on Dev.to',
  category: 'integration',
  inputSchema: DevToInputSchema,
  outputSchema: DevToOutputSchema,
  estimatedDuration: 2000,
  capabilities: {
    supportsRerun: true,
  },

  executor: async (input, context) => {
    try {
      const apiKey = context.credentials?.devto?.apiKey as string | undefined;
      
      if (!apiKey && ['createArticle', 'updateArticle'].includes(input.operation)) {
        return {
          success: false,
          error: 'Dev.to API key not configured. Provide context.credentials.devto.apiKey.',
        };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey) {
        headers['api-key'] = apiKey;
      }

      if (input.operation === 'createArticle') {
        const payload = {
          article: {
            title: input.article.title,
            body_markdown: input.article.bodyMarkdown,
            published: input.article.published,
            tags: input.article.tags,
            series: input.article.series,
            canonical_url: input.article.canonicalUrl,
            description: input.article.description,
          }
        };

        const response = await fetchWithRetry(
          `${DEVTO_BASE_URL}/articles`,
          { method: 'POST', headers, body: JSON.stringify(payload) },
          { maxRetries: 2 }
        );

        if (!response.ok) {
          throw new Error(`Failed to create article: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return { success: true, output: { article: data as DevToArticle, success: true } };
      }

      if (input.operation === 'updateArticle') {
        const payload = {
          article: {
            title: input.article.title,
            body_markdown: input.article.bodyMarkdown,
            published: input.article.published,
            tags: input.article.tags,
            series: input.article.series,
            canonical_url: input.article.canonicalUrl,
            description: input.article.description,
          }
        };
        
        // Remove undefined fields
        Object.keys(payload.article).forEach(key => 
          payload.article[key as keyof typeof payload.article] === undefined && delete payload.article[key as keyof typeof payload.article]
        );

        const response = await fetchWithRetry(
          `${DEVTO_BASE_URL}/articles/${input.articleId}`,
          { method: 'PUT', headers, body: JSON.stringify(payload) },
          { maxRetries: 2 }
        );

        if (!response.ok) {
          throw new Error(`Failed to update article: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return { success: true, output: { article: data as DevToArticle, success: true } };
      }

      if (input.operation === 'getArticles') {
        const queryParams = new URLSearchParams();
        if (input.username) queryParams.append('username', input.username);
        if (input.perPage) queryParams.append('per_page', input.perPage.toString());
        if (input.page) queryParams.append('page', input.page.toString());

        const url = `${DEVTO_BASE_URL}/articles${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        const response = await fetchWithRetry(
          url,
          { method: 'GET', headers },
          { maxRetries: 3 }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch articles: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return { success: true, output: { articles: data as DevToArticle[], success: true } };
      }

      return { success: false, error: 'Unknown operation' };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Dev.to operation failed',
      };
    }
  },
});
