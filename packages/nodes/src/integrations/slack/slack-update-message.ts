import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import {
  SlackUpdateMessageInputSchema,
  SlackUpdateMessageOutputSchema,
  type SlackUpdateMessageInput,
  type SlackUpdateMessageOutput,
} from './schemas.js';

export {
  SlackUpdateMessageInputSchema,
  SlackUpdateMessageOutputSchema,
  type SlackUpdateMessageInput,
  type SlackUpdateMessageOutput,
} from './schemas.js';

const SLACK_API_BASE = 'https://slack.com/api';

interface SlackUpdateMessageResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
  text?: string;
  error?: string;
}

export const slackUpdateMessageNode = defineNode({
  type: 'slack_update_message',
  name: 'Slack Update Message',
  description: 'Update an existing Slack message by channel and timestamp',
  category: 'integration',
  inputSchema: SlackUpdateMessageInputSchema,
  outputSchema: SlackUpdateMessageOutputSchema,
  estimatedDuration: 3,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: SlackUpdateMessageInput, context) => {
    try {
      const accessToken = context.credentials?.slack?.accessToken;
      if (!accessToken) {
        return {
          success: false,
          error: 'Slack access token not configured. Please provide context.credentials.slack.accessToken.',
        };
      }

      const response = await fetchWithRetry(
        `${SLACK_API_BASE}/chat.update`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: input.channel,
            ts: input.ts,
            text: input.text,
          }),
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
      );

      const data = (await response.json()) as SlackUpdateMessageResponse;

      if (!data.ok) {
        return {
          success: false,
          error: `Slack API error: ${data.error ?? 'unknown_error'}`,
        };
      }

      const output: SlackUpdateMessageOutput = {
        ok: true,
        ts: data.ts ?? input.ts,
        channel: data.channel ?? input.channel,
        messageText: data.text ?? null,
      };

      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update Slack message',
      };
    }
  },
});
