import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { twitterRequest } from './twitter-client.js';

interface TwitterSearchTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
}

interface TwitterSearchTweetsResponse {
  data?: TwitterSearchTweet[];
  meta?: {
    result_count?: number;
    next_token?: string;
  };
}

export const TwitterSearchTweetsInputSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(10).max(100).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  sortOrder: z.enum(['recency', 'relevancy']).optional(),
});

export type TwitterSearchTweetsInput = z.infer<typeof TwitterSearchTweetsInputSchema>;

export const TwitterSearchTweetsOutputSchema = z.object({
  tweets: z.array(z.object({
    id: z.string(),
    text: z.string(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
  })),
  resultCount: z.number(),
  nextToken: z.string().optional(),
});

export type TwitterSearchTweetsOutput = z.infer<typeof TwitterSearchTweetsOutputSchema>;

export const twitterSearchTweetsNode = defineNode({
  type: 'twitter_search_tweets',
  name: 'Twitter Search Tweets',
  description: 'Search recent tweets on Twitter/X',
  category: 'integration',
  inputSchema: TwitterSearchTweetsInputSchema,
  outputSchema: TwitterSearchTweetsOutputSchema,
  estimatedDuration: 10,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    try {
      const params = new URLSearchParams({
        query: input.query,
      });

      if (input.maxResults) {
        params.set('max_results', String(input.maxResults));
      }
      if (input.startTime) {
        params.set('start_time', input.startTime);
      }
      if (input.endTime) {
        params.set('end_time', input.endTime);
      }
      if (input.sortOrder) {
        params.set('sort_order', input.sortOrder);
      }

      params.set('tweet.fields', 'author_id,created_at');

      const response = await twitterRequest<TwitterSearchTweetsResponse>(
        context,
        `/2/tweets/search/recent?${params.toString()}`,
        {
          method: 'GET',
        }
      );

      const tweets = (response.data || []).map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        createdAt: tweet.created_at,
      }));

      return {
        success: true,
        output: {
          tweets,
          resultCount: response.meta?.result_count ?? tweets.length,
          nextToken: response.meta?.next_token,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search tweets',
      };
    }
  },
});
