import { z } from 'zod';
import { defineOAuth2Credential } from '@jam-nodes/core';

export const twitterCredential = defineOAuth2Credential({
  pkce: true,
  name: 'twitter',
  displayName: 'Twitter/X OAuth2',
  documentationUrl: 'https://developer.twitter.com/en/docs',
  config: {
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'dm.read',
      'dm.write',
      'like.read',
      'like.write',
      'offline.access',
    ],
    pkce: true,
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.number().optional(),
    // OAuth 1.0a — enables read + write operations
    consumerKey: z.string().optional(),
    consumerSecret: z.string().optional(),
    accessTokenSecret: z.string().optional(),
    bearerToken: z.string().optional(),
  }),
});
