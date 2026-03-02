import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { getAuthenticatedTwitterUserId, twitterRequest } from './twitter-client.js';

interface TwitterRetweetResponse {
  data?: {
    retweeted?: boolean;
  };
}

export const TwitterRetweetInputSchema = z.object({
  tweetId: z.string().min(1),
});

export type TwitterRetweetInput = z.infer<typeof TwitterRetweetInputSchema>;

export const TwitterRetweetOutputSchema = z.object({
  retweeted: z.boolean(),
});

export type TwitterRetweetOutput = z.infer<typeof TwitterRetweetOutputSchema>;

export const twitterRetweetNode = defineNode({
  type: 'twitter_retweet',
  name: 'Twitter Retweet',
  description: 'Retweet a tweet on Twitter/X',
  category: 'integration',
  inputSchema: TwitterRetweetInputSchema,
  outputSchema: TwitterRetweetOutputSchema,
  estimatedDuration: 6,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    try {
      const userId = await getAuthenticatedTwitterUserId(context);
      const response = await twitterRequest<TwitterRetweetResponse>(
        context,
        `/2/users/${encodeURIComponent(userId)}/retweets`,
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
          retweeted: Boolean(response.data?.retweeted),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retweet',
      };
    }
  },
});
