import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { twitterRequest } from './twitter-client.js';

interface TwitterCreateTweetResponse {
  data?: {
    id?: string;
    text?: string;
  };
}

export const TwitterCreateTweetInputSchema = z.object({
  text: z.string().min(1),
  replyToTweetId: z.string().optional(),
  mediaIds: z.array(z.string()).optional(),
  quoteTweetId: z.string().optional(),
  poll: z.object({
    options: z.array(z.string()).min(2).max(4),
    durationMinutes: z.number().int().min(5).max(10080),
  }).optional(),
});

export type TwitterCreateTweetInput = z.infer<typeof TwitterCreateTweetInputSchema>;

export const TwitterCreateTweetOutputSchema = z.object({
  tweetId: z.string(),
  text: z.string(),
});

export type TwitterCreateTweetOutput = z.infer<typeof TwitterCreateTweetOutputSchema>;

export const twitterCreateTweetNode = defineNode({
  type: 'twitter_create_tweet',
  name: 'Twitter Create Tweet',
  description: 'Create a new tweet on Twitter/X',
  category: 'integration',
  inputSchema: TwitterCreateTweetInputSchema,
  outputSchema: TwitterCreateTweetOutputSchema,
  estimatedDuration: 8,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    try {
      const payload: Record<string, unknown> = {
        text: input.text,
      };

      if (input.replyToTweetId) {
        payload['reply'] = {
          in_reply_to_tweet_id: input.replyToTweetId,
        };
      }

      if (input.mediaIds && input.mediaIds.length > 0) {
        payload['media'] = {
          media_ids: input.mediaIds,
        };
      }

      if (input.quoteTweetId) {
        payload['quote_tweet_id'] = input.quoteTweetId;
      }

      if (input.poll) {
        payload['poll'] = {
          options: input.poll.options,
          duration_minutes: input.poll.durationMinutes,
        };
      }

      const response = await twitterRequest<TwitterCreateTweetResponse>(
        context,
        '/2/tweets',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const tweetId = response.data?.id;
      if (!tweetId) {
        return {
          success: false,
          error: 'Twitter API returned an invalid create tweet response.',
        };
      }

      return {
        success: true,
        output: {
          tweetId,
          text: response.data?.text || input.text,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tweet',
      };
    }
  },
});
