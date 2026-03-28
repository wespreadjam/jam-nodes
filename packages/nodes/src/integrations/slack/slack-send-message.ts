import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import {
  SlackSendMessageInputSchema,
  SlackSendMessageOutputSchema,
  type SlackSendMessageInput,
  type SlackSendMessageOutput,
} from './schemas.js';

export {
  SlackSendMessageInputSchema,
  SlackSendMessageOutputSchema,
  type SlackSendMessageInput,
  type SlackSendMessageOutput,
} from './schemas.js';

const SLACK_API_BASE = 'https://slack.com/api';

interface SlackPostMessageResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
  message?: { text?: string };
  error?: string;
}

export const slackSendMessageNode = defineNode({
  type: 'slack_send_message',
  name: 'Slack Send Message',
  description: 'Send a message to a Slack channel or DM, with optional Block Kit blocks, attachments, and thread support',
  category: 'integration',
  inputSchema: SlackSendMessageInputSchema,
  outputSchema: SlackSendMessageOutputSchema,
  estimatedDuration: 3,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: SlackSendMessageInput, context) => {
    try {
      const accessToken = context.credentials?.slack?.accessToken;
      if (!accessToken) {
        return {
          success: false,
          error: 'Slack access token not configured. Please provide context.credentials.slack.accessToken.',
        };
      }

      const body: Record<string, unknown> = {
        channel: input.channel,
        text: input.text,
      };
      if (input.blocks) body.blocks = input.blocks;
      if (input.attachments) body.attachments = input.attachments;
      if (input.threadTs) body.thread_ts = input.threadTs;
      if (input.unfurlLinks !== undefined) body.unfurl_links = input.unfurlLinks;
      if (input.unfurlMedia !== undefined) body.unfurl_media = input.unfurlMedia;

      const response = await fetchWithRetry(
        `${SLACK_API_BASE}/chat.postMessage`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
      );

      const data = (await response.json()) as SlackPostMessageResponse;

      if (!data.ok) {
        return {
          success: false,
          error: `Slack API error: ${data.error ?? 'unknown_error'}`,
        };
      }

      const output: SlackSendMessageOutput = {
        ok: true,
        ts: data.ts ?? '',
        channel: data.channel ?? input.channel,
        messageText: data.message?.text ?? null,
      };

      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send Slack message',
      };
    }
  },
});
