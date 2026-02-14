import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

// =============================================================================
// Types
// =============================================================================

/**
 * LinkedIn post in unified social format
 */
export interface LinkedInPost {
  id: string;
  platform: 'linkedin';
  url: string;
  text: string;
  authorName: string;
  authorHandle: string;
  authorUrl: string;
  authorFollowers: number;
  authorHeadline?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  hashtags: string[];
  postedAt: string;
}

// =============================================================================
// Schemas
// =============================================================================

export const LinkedInMonitorInputSchema = z.object({
  /** Keywords to search for */
  keywords: z.array(z.string()),
  /** Time filter for results */
  timeFilter: z.string().optional(),
  /** Maximum number of results */
  maxResults: z.number().optional().default(50),
});

export type LinkedInMonitorInput = z.infer<typeof LinkedInMonitorInputSchema>;

export const LinkedInMonitorOutputSchema = z.object({
  posts: z.array(z.object({
    id: z.string(),
    platform: z.literal('linkedin'),
    url: z.string(),
    text: z.string(),
    authorName: z.string(),
    authorHandle: z.string(),
    authorUrl: z.string(),
    authorFollowers: z.number(),
    authorHeadline: z.string().optional(),
    engagement: z.object({
      likes: z.number(),
      comments: z.number(),
      shares: z.number(),
    }),
    hashtags: z.array(z.string()),
    postedAt: z.string(),
  })),
  totalFound: z.number(),
});

export type LinkedInMonitorOutput = z.infer<typeof LinkedInMonitorOutputSchema>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract hashtags from post text
 */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

/**
 * Extract LinkedIn handle from profile URL
 */
function extractHandleFromUrl(url: string | undefined): string {
  if (!url) return 'unknown';
  try {
    const parts = url.split('/');
    const inIndex = parts.indexOf('in');
    if (inIndex !== -1) {
      const handle = parts[inIndex + 1];
      if (handle) {
        return handle.split('?')[0] ?? 'unknown';
      }
    }
    const companyIndex = parts.indexOf('company');
    if (companyIndex !== -1) {
      const handle = parts[companyIndex + 1];
      if (handle) {
        return handle.split('?')[0] ?? 'unknown';
      }
    }
    const lastPart = parts[parts.length - 1];
    return lastPart?.split('?')[0] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// =============================================================================
// Node Definition
// =============================================================================

/**
 * LinkedIn Monitor Node
 *
 * Searches LinkedIn for posts matching keywords using ForumScout API.
 * Requires `context.services.forumScout` to be provided by the host application.
 *
 * @example
 * ```typescript
 * const result = await linkedinMonitorNode.executor({
 *   keywords: ['hiring', 'remote'],
 *   maxResults: 25
 * }, context);
 * ```
 */
export const linkedinMonitorNode = defineNode({
  type: 'linkedin_monitor',
  name: 'LinkedIn Monitor',
  description: 'Search LinkedIn for posts matching keywords using ForumScout',
  category: 'integration',
  inputSchema: LinkedInMonitorInputSchema,
  outputSchema: LinkedInMonitorOutputSchema,
  estimatedDuration: 60,
  capabilities: {
    supportsRerun: true,
  },

  executor: async (input, context) => {
    try {
      const keywords = input.keywords.map(k => k.trim()).filter(Boolean);

      if (keywords.length === 0) {
        return {
          success: false,
          error: 'No valid keywords provided',
        };
      }

      // Require ForumScout service
      if (!context.services?.forumScout) {
        return {
          success: false,
          error: 'ForumScout service not configured. Please provide context.services.forumScout.',
        };
      }

      // Search LinkedIn via ForumScout
      const results = await context.services.forumScout.searchLinkedIn(keywords, {
        maxResults: input.maxResults || 50,
        timeFilter: input.timeFilter,
      });

      // Transform to unified format
      const posts: LinkedInPost[] = results.map(post => ({
        id: post.id,
        platform: 'linkedin' as const,
        url: post.url,
        text: post.text,
        authorName: post.authorName,
        authorHandle: extractHandleFromUrl(post.authorUrl),
        authorUrl: post.authorUrl || '',
        // ForumScout may not always return follower data
        authorFollowers: post.authorFollowers || 0,
        authorHeadline: post.authorHeadline,
        engagement: {
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
        },
        hashtags: post.hashtags || extractHashtags(post.text),
        postedAt: post.createdAt,
      }));

      // Optional: send notification if service available
      if (context.services?.notifications && posts.length > 0) {
        await context.services.notifications.send({
          userId: context.userId,
          title: 'LinkedIn Monitor Complete',
          message: `Found ${posts.length} LinkedIn posts`,
          data: { posts: posts.slice(0, 5) },
        });
      }

      return {
        success: true,
        output: {
          posts,
          totalFound: posts.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to monitor LinkedIn',
      };
    }
  },
});
