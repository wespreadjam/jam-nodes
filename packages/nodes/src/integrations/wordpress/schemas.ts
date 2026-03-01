import { z } from 'zod'

// ─── Normalized post shape shared across create/update/get ───────────────────

export const WordPressPostSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  link: z.string(),
  date: z.string(),
  modified: z.string(),
  author: z.number(),
  featuredMedia: z.number(),
  categories: z.array(z.number()),
  tags: z.array(z.number()),
  content: z.string().optional(),
  excerpt: z.string().optional(),
})

// ─── Input schemas ────────────────────────────────────────────────────────────

export const WordPressCreatePostInputSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  status: z.enum(['publish', 'draft', 'private', 'pending']).optional(),
  categories: z.array(z.number().int().positive()).optional(),
  tags: z.array(z.number().int().positive()).optional(),
  featuredMediaId: z.number().int().positive().optional(),
  excerpt: z.string().optional(),
  slug: z.string().optional(),
})

export const WordPressUpdatePostInputSchema = z.object({
  postId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  status: z.enum(['publish', 'draft', 'private', 'pending']).optional(),
})

export const WordPressGetPostsInputSchema = z.object({
  status: z.string().optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  page: z.number().int().positive().optional(),
  search: z.string().optional(),
})

// ─── Output schemas ───────────────────────────────────────────────────────────

export const WordPressCreatePostOutputSchema = WordPressPostSchema

export const WordPressUpdatePostOutputSchema = WordPressPostSchema

export const WordPressGetPostsOutputSchema = z.object({
  posts: z.array(WordPressPostSchema),
  meta: z.object({
    totalFound: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
})

// ─── Raw API response shape (internal use only) ───────────────────────────────

export interface WordPressApiPost {
  id: number
  title: { rendered: string }
  slug: string
  status: string
  link: string
  date: string
  modified: string
  author: number
  featured_media: number
  categories: number[]
  tags: number[]
  content?: { rendered: string }
  excerpt?: { rendered: string }
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Normalize a raw WordPress REST API post response into the minimal output shape.
 */
export function normalizeWordPressPost(raw: WordPressApiPost): WordPressPost {
  const normalized: WordPressPost = {
    id: raw.id,
    title: raw.title.rendered,
    slug: raw.slug,
    status: raw.status,
    link: raw.link,
    date: raw.date,
    modified: raw.modified,
    author: raw.author,
    featuredMedia: raw.featured_media,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
  }
  if (raw.content !== undefined) {
    normalized.content = raw.content.rendered
  }
  if (raw.excerpt !== undefined) {
    normalized.excerpt = raw.excerpt.rendered
  }
  return normalized
}

// ─── Type exports ─────────────────────────────────────────────────────────────

export type WordPressPost = z.infer<typeof WordPressPostSchema>
export type WordPressCreatePostInput = z.infer<
  typeof WordPressCreatePostInputSchema
>
export type WordPressCreatePostOutput = z.infer<
  typeof WordPressCreatePostOutputSchema
>
export type WordPressUpdatePostInput = z.infer<
  typeof WordPressUpdatePostInputSchema
>
export type WordPressUpdatePostOutput = z.infer<
  typeof WordPressUpdatePostOutputSchema
>
export type WordPressGetPostsInput = z.infer<typeof WordPressGetPostsInputSchema>
export type WordPressGetPostsOutput = z.infer<typeof WordPressGetPostsOutputSchema>
