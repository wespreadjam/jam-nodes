import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';
import {
  SlackSearchMessagesInputSchema,
  SlackSearchMessagesOutputSchema,
  type SlackSearchMessagesInput,
  type SlackSearchMessagesOutput,
  type SlackSearchMatch,
} from './schemas.js';

export {
  SlackSearchMessagesInputSchema,
  SlackSearchMessagesOutputSchema,
  type SlackSearchMessagesInput,
  type SlackSearchMessagesOutput,
} from './schemas.js';

const SLACK_API_BASE = 'https://slack.com/api';

interface SlackRawMatch {
  type: string;
  ts: string;
  text: string;
  channel: { id: string; name: string };
  username?: string;
  permalink?: string;
}

interface SlackSearchResponse {
  ok: boolean;
  query?: string;
  messages?: {
    total?: number;
    matches?: SlackRawMatch[];
  };
  error?: string;
}

export const slackSearchMessagesNode = defineNode({
  type: 'slack_search_messages',
  name: 'Slack Search Messages',
  description: 'Search Slack messages using a query string with optional sort and count',
  category: 'integration',
  inputSchema: SlackSearchMessagesInputSchema,
  outputSchema: SlackSearchMessagesOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input: SlackSearchMessagesInput, context) => {
    try {
      const accessToken = context.credentials?.slack?.accessToken;
      if (!accessToken) {
        return {
          success: false,
          error: 'Slack access token not configured. Please provide context.credentials.slack.accessToken.',
        };
      }

      const params = new URLSearchParams({
        query: input.query,
        sort: input.sort ?? 'score',
        count: String(input.count ?? 20),
      });

      const response = await fetchWithRetry(
        `${SLACK_API_BASE}/search.messages?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
      );

      const data = (await response.json()) as SlackSearchResponse;

      if (!data.ok) {
        return {
          success: false,
          error: `Slack API error: ${data.error ?? 'unknown_error'}`,
        };
      }

      const matches: SlackSearchMatch[] = (data.messages?.matches ?? []).map((m) => ({
        type: m.type,
        ts: m.ts,
        text: m.text,
        channel: { id: m.channel.id, name: m.channel.name },
        username: m.username,
        permalink: m.permalink,
      }));

      const output: SlackSearchMessagesOutput = {
        ok: true,
        query: data.query ?? input.query,
        total: data.messages?.total ?? matches.length,
        matches,
      };

      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search Slack messages',
      };
    }
  },
});
