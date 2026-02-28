import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import {
  DiscordSendMessageInputSchema,
  DiscordSendMessageOutputSchema,
  type DiscordSendMessageInput,
  type DiscordSendMessageOutput,
} from './schemas.js';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

interface DiscordMessageResponse {
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
  DiscordSendMessageInputSchema,
  DiscordSendMessageOutputSchema,
  type DiscordSendMessageInput,
  type DiscordSendMessageOutput,
} from './schemas.js';

export const discordSendMessageNode = defineNode({
  type: 'discord_send_message',
  name: 'Discord Send Message',
  description: 'Send a message to a Discord channel with optional embeds',
  category: 'integration',
  inputSchema: DiscordSendMessageInputSchema,
  outputSchema: DiscordSendMessageOutputSchema,
  estimatedDuration: 3,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: DiscordSendMessageInput, context) => {
    try {
      const botToken = context.credentials?.discordBot?.botToken;
      if (!botToken) {
        return {
          success: false,
          error:
            'Discord bot token not configured. Please provide context.credentials.discordBot.botToken.',
        };
      }

      const response = await fetchWithRetry(
        `${DISCORD_API_BASE}/channels/${input.channelId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
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
          error: `Discord API error: ${await readDiscordError(response)}`,
        };
      }

      const data = (await response.json()) as DiscordMessageResponse;

      const output: DiscordSendMessageOutput = {
        messageId: data.id,
        channelId: data.channel_id,
        guildId: data.guild_id ?? null,
        url: data.guild_id
          ? `https://discord.com/channels/${data.guild_id}/${data.channel_id}/${data.id}`
          : `https://discord.com/channels/@me/${data.channel_id}/${data.id}`,
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
        error: error instanceof Error ? error.message : 'Failed to send Discord message',
      };
    }
  },
});
