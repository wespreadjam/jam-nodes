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
  content: z.string().min(1).optional(),
  status: z.enum(['publish', 'draft', 'private', 'pending']).optional(),
})

export const WordPressGetPostsInputSchema = z.object({
  status: z.enum(['publish', 'draft', 'private', 'pending', 'future', 'trash', 'any']).optional(),
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

// ─── Upload media schemas ─────────────────────────────────────────────────────

export const WordPressMediaSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  link: z.string(),
  sourceUrl: z.string(),
  mediaType: z.string(),
  mimeType: z.string(),
})

export const WordPressUploadMediaInputSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  contentBase64: z.string().min(1),
})

export const WordPressUploadMediaOutputSchema = WordPressMediaSchema

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

export interface WordPressApiMedia {
  id: number
  title: { rendered: string }
  slug: string
  status: string
  link: string
  source_url: string
  media_type: string
  mime_type: string
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

/**
 * Normalize a raw WordPress REST API media response into the minimal output shape.
 */
export function normalizeWordPressMedia(raw: WordPressApiMedia): WordPressMedia {
  return {
    id: raw.id,
    title: raw.title.rendered,
    slug: raw.slug,
    status: raw.status,
    link: raw.link,
    sourceUrl: raw.source_url,
    mediaType: raw.media_type,
    mimeType: raw.mime_type,
  }
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
export type WordPressGetPostsInput = z.infer<
  typeof WordPressGetPostsInputSchema
>
export type WordPressGetPostsOutput = z.infer<
  typeof WordPressGetPostsOutputSchema
>
export type WordPressMedia = z.infer<typeof WordPressMediaSchema>
export type WordPressUploadMediaInput = z.infer<
  typeof WordPressUploadMediaInputSchema
>
export type WordPressUploadMediaOutput = z.infer<
  typeof WordPressUploadMediaOutputSchema
>
