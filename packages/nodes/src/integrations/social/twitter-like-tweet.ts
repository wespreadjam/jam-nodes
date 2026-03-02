import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { getAuthenticatedTwitterUserId, twitterRequest } from './twitter-client.js';

interface TwitterLikeTweetResponse {
  data?: {
    liked?: boolean;
  };
}

export const TwitterLikeTweetInputSchema = z.object({
  tweetId: z.string().min(1),
});

export type TwitterLikeTweetInput = z.infer<typeof TwitterLikeTweetInputSchema>;

export const TwitterLikeTweetOutputSchema = z.object({
  liked: z.boolean(),
});

export type TwitterLikeTweetOutput = z.infer<typeof TwitterLikeTweetOutputSchema>;

export const twitterLikeTweetNode = defineNode({
  type: 'twitter_like_tweet',
  name: 'Twitter Like Tweet',
  description: 'Like a tweet on Twitter/X',
  category: 'integration',
  inputSchema: TwitterLikeTweetInputSchema,
  outputSchema: TwitterLikeTweetOutputSchema,
  estimatedDuration: 6,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    try {
      const userId = await getAuthenticatedTwitterUserId(context);
      const response = await twitterRequest<TwitterLikeTweetResponse>(
        context,
        `/2/users/${encodeURIComponent(userId)}/likes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tweet_id: input.tweetId,
          }),
        }
      );

      return {
        success: true,
        output: {
          liked: Boolean(response.data?.liked),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like tweet',
      };
    }
  },
});
