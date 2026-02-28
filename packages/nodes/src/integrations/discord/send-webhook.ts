import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import {
  DiscordSendWebhookInputSchema,
  DiscordSendWebhookOutputSchema,
  type DiscordSendWebhookInput,
  type DiscordSendWebhookOutput,
} from './schemas.js';

interface DiscordWebhookMessageResponse {
  id: string;
  channel_id: string;
  guild_id?: string;
  content: string;
  embeds?: unknown[];
}

async function readDiscordError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;
  try {
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message || text;
  } catch {
    return text;
  }
}

export {
  DiscordSendWebhookInputSchema,
  DiscordSendWebhookOutputSchema,
  type DiscordSendWebhookInput,
  type DiscordSendWebhookOutput,
} from './schemas.js';

export const discordSendWebhookNode = defineNode({
  type: 'discord_send_webhook',
  name: 'Discord Send Webhook',
  description: 'Send a Discord webhook message with optional embeds',
  category: 'integration',
  inputSchema: DiscordSendWebhookInputSchema,
  outputSchema: DiscordSendWebhookOutputSchema,
  estimatedDuration: 2,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: DiscordSendWebhookInput, context) => {
    try {
      const webhookUrl = input.webhookUrl || context.credentials?.discordWebhook?.webhookUrl;
      if (!webhookUrl) {
        return {
          success: false,
          error:
            'Discord webhook URL not configured. Provide input.webhookUrl or context.credentials.discordWebhook.webhookUrl.',
        };
      }

      const requestUrl = webhookUrl.includes('?')
        ? `${webhookUrl}&wait=true`
        : `${webhookUrl}?wait=true`;

      const response = await fetchWithRetry(
        requestUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: input.content,
            embeds: input.embeds ?? [],
          }),
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Discord webhook error: ${await readDiscordError(response)}`,
        };
      }

      const data = (await response.json()) as DiscordWebhookMessageResponse;

      const output: DiscordSendWebhookOutput = {
        messageId: data.id,
        channelId: data.channel_id,
        guildId: data.guild_id ?? null,
        content: data.content ?? null,
        embedsCount: data.embeds?.length ?? 0,
      };

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send Discord webhook',
      };
    }
  },
});
