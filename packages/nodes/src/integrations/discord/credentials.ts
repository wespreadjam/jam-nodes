import { z } from 'zod';
import { defineApiKeyCredential, type WebhookCredentialDefinition } from '@jam-nodes/core';

export const discordBotCredential = defineApiKeyCredential({
  name: 'discordBot',
  displayName: 'Discord Bot Token',
  documentationUrl: 'https://discord.com/developers/docs/topics/oauth2#bot-tokens',
  schema: z.object({
    botToken: z.string(),
  }),
  authenticate: {
    type: 'header',
    properties: {
      Authorization: 'Bot {{botToken}}',
    },
  },
});

export const discordWebhookCredential: WebhookCredentialDefinition = {
  name: 'discordWebhook',
  type: 'webhook',
  displayName: 'Discord Webhook',
  documentationUrl: 'https://discord.com/developers/docs/resources/webhook',
  schema: z.object({
    webhookUrl: z.string().url(),
  }),
};
