import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import {
  SlackGetChannelHistoryInputSchema,
  SlackGetChannelHistoryOutputSchema,
  type SlackGetChannelHistoryInput,
  type SlackGetChannelHistoryOutput,
  type SlackMessage,
} from './schemas.js';

export {
  SlackGetChannelHistoryInputSchema,
  SlackGetChannelHistoryOutputSchema,
  type SlackGetChannelHistoryInput,
  type SlackGetChannelHistoryOutput,
} from './schemas.js';

const SLACK_API_BASE = 'https://slack.com/api';

interface SlackRawMessage {
  type: string;
  ts: string;
  user?: string;
  text?: string;
  thread_ts?: string;
  reply_count?: number;
}

interface SlackConversationsHistoryResponse {
  ok: boolean;
  messages?: SlackRawMessage[];
  has_more?: boolean;
  error?: string;
}

export const slackGetChannelHistoryNode = defineNode({
  type: 'slack_get_channel_history',
  name: 'Slack Get Channel History',
  description: 'Fetch message history from a Slack channel with optional time bounds',
  category: 'integration',
  inputSchema: SlackGetChannelHistoryInputSchema,
  outputSchema: SlackGetChannelHistoryOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: SlackGetChannelHistoryInput, context) => {
    try {
      const accessToken = context.credentials?.slack?.accessToken;
      if (!accessToken) {
        return {
          success: false,
          error: 'Slack access token not configured. Please provide context.credentials.slack.accessToken.',
        };
      }

      const params = new URLSearchParams({
        channel: input.channel,
        limit: String(input.limit ?? 100),
      });
      if (input.oldest) params.set('oldest', input.oldest);
      if (input.latest) params.set('latest', input.latest);

      const response = await fetchWithRetry(
        `${SLACK_API_BASE}/conversations.history?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
      );

      const data = (await response.json()) as SlackConversationsHistoryResponse;

      if (!data.ok) {
        return {
          success: false,
          error: `Slack API error: ${data.error ?? 'unknown_error'}`,
        };
      }

      const messages: SlackMessage[] = (data.messages ?? []).map((m) => ({
        type: m.type,
        ts: m.ts,
        user: m.user,
        text: m.text,
        threadTs: m.thread_ts,
        replyCount: m.reply_count,
      }));

      const output: SlackGetChannelHistoryOutput = {
        ok: true,
        messages,
        hasMore: data.has_more ?? false,
      };

      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Slack channel history',
      };
    }
  },
});
