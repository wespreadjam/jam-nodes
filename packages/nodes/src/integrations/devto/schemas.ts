import { z } from 'zod'

// Normalized article shape shared across create/update/get
export const DevtoArticleSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  url: z.string(),
  published: z.boolean(),
  publishedAt: z.string().nullable(),
  tags: z.array(z.string()),
  description: z.string().nullable(),
  readingTimeMinutes: z.number(),
})

// Input schemas

export const DevtoCreateArticleInputSchema = z.object({
  title: z.string().min(1),
  bodyMarkdown: z.string().min(1),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  series: z.string().optional(),
  canonicalUrl: z.string().url().optional(),
  description: z.string().optional(),
})

export const DevtoUpdateArticleInputSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).optional(),
  bodyMarkdown: z.string().min(1).optional(),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
})

export const DevtoGetArticlesInputSchema = z.object({
  username: z.string().optional(),
  page: z.number().int().positive().optional(),
  perPage: z.number().int().positive().max(1000).optional(),
})

// Output schemas

export const DevtoCreateArticleOutputSchema = DevtoArticleSchema

export const DevtoUpdateArticleOutputSchema = DevtoArticleSchema

export const DevtoGetArticlesOutputSchema = z.object({
  articles: z.array(DevtoArticleSchema),
  page: z.number(),
  perPage: z.number(),
  count: z.number(),
})

// Raw API response shape (internal use only)
export interface DevtoApiArticle {
  id: number
  title: string
  slug: string
  url: string
  published: boolean
  published_at: string | null
  tag_list: string[] | string
  description: string | null
  reading_time_minutes: number
}

/**
 * Normalize a raw Dev.to API article response into the minimal output shape.
 */
export function normalizeDevtoArticle(raw: DevtoApiArticle): DevtoArticle {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    url: raw.url,
    published: raw.published,
    publishedAt: raw.published_at ?? null,
    tags: Array.isArray(raw.tag_list)
      ? raw.tag_list
      : raw.tag_list
        ? raw.tag_list
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    description: raw.description ?? null,
    readingTimeMinutes: raw.reading_time_minutes ?? 0,
  }
}

// Type exports
export type DevtoArticle = z.infer<typeof DevtoArticleSchema>
export type DevtoCreateArticleInput = z.infer<
  typeof DevtoCreateArticleInputSchema
>
export type DevtoCreateArticleOutput = z.infer<
  typeof DevtoCreateArticleOutputSchema
>
export type DevtoUpdateArticleInput = z.infer<
  typeof DevtoUpdateArticleInputSchema
>
export type DevtoUpdateArticleOutput = z.infer<
  typeof DevtoUpdateArticleOutputSchema
>
export type DevtoGetArticlesInput = z.infer<typeof DevtoGetArticlesInputSchema>
export type DevtoGetArticlesOutput = z.infer<
  typeof DevtoGetArticlesOutputSchema
>
