import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { twitterRequest } from './twitter-client.js';

interface TwitterGetUserByUsernameResponse {
  data?: {
    id?: string;
    name?: string;
    username?: string;
    description?: string;
    verified?: boolean;
  };
}

export const TwitterGetUserByUsernameInputSchema = z.object({
  username: z.string().min(1),
});

export type TwitterGetUserByUsernameInput = z.infer<typeof TwitterGetUserByUsernameInputSchema>;

export const TwitterGetUserByUsernameOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  description: z.string().optional(),
  verified: z.boolean().optional(),
});

export type TwitterGetUserByUsernameOutput = z.infer<typeof TwitterGetUserByUsernameOutputSchema>;

export const twitterGetUserByUsernameNode = defineNode({
  type: 'twitter_get_user_by_username',
  name: 'Twitter Get User By Username',
  description: 'Get a Twitter/X user profile by username',
  category: 'integration',
  inputSchema: TwitterGetUserByUsernameInputSchema,
  outputSchema: TwitterGetUserByUsernameOutputSchema,
  estimatedDuration: 6,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    try {
      const response = await twitterRequest<TwitterGetUserByUsernameResponse>(
        context,
        `/2/users/by/username/${encodeURIComponent(input.username)}?user.fields=description,verified`,
        {
          method: 'GET',
        }
      );

      const user = response.data;
      if (!user?.id || !user.username || !user.name) {
        return {
          success: false,
          error: 'Twitter API returned an invalid user response.',
        };
      }

      return {
        success: true,
        output: {
          id: user.id,
          name: user.name,
          username: user.username,
          description: user.description,
          verified: user.verified,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
      };
    }
  },
});
