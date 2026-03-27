import { defineOAuth2Credential } from '@jam-nodes/core';
import { z } from 'zod';

export const slackCredential = defineOAuth2Credential({
  name: 'slack',
  displayName: 'Slack OAuth2',
  documentationUrl: 'https://api.slack.com/authentication/oauth-v2',
  config: {
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'channels:read',
      'channels:write',
      'chat:write',
      'chat:write.public',
      'files:write',
      'groups:read',
      'im:read',
      'im:write',
      'users:read',
      'search:read',
    ],
  },
  schema: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string(),
    teamId: z.string().optional(),
  }),
});
