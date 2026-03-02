import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { twitterRequest } from './twitter-client.js';

interface TwitterDeleteTweetResponse {
  data?: {
    deleted?: boolean;
  };
}

export const TwitterDeleteTweetInputSchema = z.object({
  tweetId: z.string().min(1),
});

export type TwitterDeleteTweetInput = z.infer<typeof TwitterDeleteTweetInputSchema>;

export const TwitterDeleteTweetOutputSchema = z.object({
  deleted: z.boolean(),
});

export type TwitterDeleteTweetOutput = z.infer<typeof TwitterDeleteTweetOutputSchema>;

export const twitterDeleteTweetNode = defineNode({
  type: 'twitter_delete_tweet',
  name: 'Twitter Delete Tweet',
  description: 'Delete one of your tweets on Twitter/X',
  category: 'integration',
  inputSchema: TwitterDeleteTweetInputSchema,
  outputSchema: TwitterDeleteTweetOutputSchema,
  estimatedDuration: 6,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    try {
      const response = await twitterRequest<TwitterDeleteTweetResponse>(
        context,
        `/2/tweets/${encodeURIComponent(input.tweetId)}`,
        {
          method: 'DELETE',
        }
      );

      return {
        success: true,
        output: {
          deleted: Boolean(response.data?.deleted),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete tweet',
      };
    }
  },
});
