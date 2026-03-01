import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import {
  DiscordCreateThreadInputSchema,
  DiscordCreateThreadOutputSchema,
  type DiscordCreateThreadInput,
  type DiscordCreateThreadOutput,
} from './schemas.js';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const GUILD_PUBLIC_THREAD = 11;

interface DiscordMessageResponse {
  id: string;
}

interface DiscordThreadResponse {
  id: string;
  parent_id: string;
  name: string;
  type?: number;
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

async function createStarterMessage(
  channelId: string,
  message: string,
  botToken: string
): Promise<DiscordMessageResponse> {
  const response = await fetchWithRetry(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
  );

  if (!response.ok) {
    throw new Error(`Discord API error: ${await readDiscordError(response)}`);
  }

  return (await response.json()) as DiscordMessageResponse;
}

async function createThreadFromMessage(
  channelId: string,
  messageId: string,
  name: string,
  botToken: string
): Promise<DiscordThreadResponse> {
  const response = await fetchWithRetry(
    `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}/threads`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
      }),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
  );

  if (!response.ok) {
    throw new Error(`Discord API error: ${await readDiscordError(response)}`);
  }

  return (await response.json()) as DiscordThreadResponse;
}

async function createStandaloneThread(
  channelId: string,
  name: string,
  botToken: string
): Promise<DiscordThreadResponse> {
  const response = await fetchWithRetry(
    `${DISCORD_API_BASE}/channels/${channelId}/threads`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        type: GUILD_PUBLIC_THREAD,
      }),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
  );

  if (!response.ok) {
    throw new Error(`Discord API error: ${await readDiscordError(response)}`);
  }

  return (await response.json()) as DiscordThreadResponse;
}

export {
  DiscordCreateThreadInputSchema,
  DiscordCreateThreadOutputSchema,
  type DiscordCreateThreadInput,
  type DiscordCreateThreadOutput,
} from './schemas.js';

export const discordCreateThreadNode = defineNode({
  type: 'discord_create_thread',
  name: 'Discord Create Thread',
  description: 'Create a Discord thread, optionally with a starter message',
  category: 'integration',
  inputSchema: DiscordCreateThreadInputSchema,
  outputSchema: DiscordCreateThreadOutputSchema,
  estimatedDuration: 4,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: DiscordCreateThreadInput, context) => {
    try {
      const botToken = context.credentials?.discordBot?.botToken;
      if (!botToken) {
        return {
          success: false,
          error:
            'Discord bot token not configured. Please provide context.credentials.discordBot.botToken.',
        };
      }

      let starterMessageId: string | null = null;
      let thread: DiscordThreadResponse;

      if (input.message) {
        const starterMessage = await createStarterMessage(
          input.channelId,
          input.message,
          botToken
        );
        starterMessageId = starterMessage.id;
        thread = await createThreadFromMessage(
          input.channelId,
          starterMessage.id,
          input.name,
          botToken
        );
      } else {
        thread = await createStandaloneThread(input.channelId, input.name, botToken);
      }

      const output: DiscordCreateThreadOutput = {
        threadId: thread.id,
        parentChannelId: thread.parent_id,
        name: thread.name,
        starterMessageId,
        threadType: thread.type ?? null,
      };

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Discord thread',
      };
    }
  },
});
